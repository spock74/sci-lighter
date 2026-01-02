
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { Mic, MicOff, X, Volume2 } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { TextAnnotation } from '../types';

interface LiveTranscriptionPanelProps {
  annotation: TextAnnotation;
  onClose: () => void;
}

const LiveTranscriptionPanel: React.FC<LiveTranscriptionPanelProps> = ({ annotation, onClose }) => {
  const { t, locale } = useLanguage();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState<{ type: 'user' | 'ai', text: string }[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [currentOutput, setCurrentOutput] = useState('');
  
  const currentInputRef = useRef('');
  const currentOutputRef = useRef('');
  
  const sessionRef = useRef<any>(null);
  const audioContextsRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  const createBlob = (data: Float32Array): Blob => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  };

  useEffect(() => {
    startSession();
    return () => stopSession();
  }, []);

  const startSession = async () => {
    try {
      // CRITICAL: Instantiate fresh client inside session start to ensure use of correct API key from environment
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextsRef.current = { input: inputCtx, output: outputCtx };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const systemMsg = `You are a helpful reading assistant. The user has highlighted the following text: "${annotation.text}". 
      Respond in ${locale === 'pt' ? 'Portuguese' : 'English'}. Be concise and engaging.`;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setIsListening(true);
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              // CRITICAL: Always use sessionPromise.then to avoid race conditions and stale closures when sending data
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              currentInputRef.current += text;
              setCurrentInput(currentInputRef.current);
            }
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              currentOutputRef.current += text;
              setCurrentOutput(currentOutputRef.current);
            }
            if (message.serverContent?.turnComplete) {
              const fullInput = currentInputRef.current;
              const fullOutput = currentOutputRef.current;
              
              setTranscript(prev => [
                ...prev, 
                { type: 'user', text: fullInput || '...' },
                { type: 'ai', text: fullOutput || '...' }
              ]);
              
              currentInputRef.current = '';
              currentOutputRef.current = '';
              setCurrentInput('');
              setCurrentOutput('');
            }

            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              const ctx = audioContextsRef.current!.output;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              // CRITICAL: Schedule playback to start exactly after the previous chunk to ensure gapless streaming
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }

            if (message.serverContent?.interrupted) {
              for (const source of sourcesRef.current) {
                try { source.stop(); } catch(e) {}
              }
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => setIsListening(false),
          onerror: (e: ErrorEvent) => {
            console.error('Live session error:', e);
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: systemMsg,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error('Failed to start live session:', err);
    }
  };

  const stopSession = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (audioContextsRef.current) {
      audioContextsRef.current.input.close();
      audioContextsRef.current.output.close();
    }
    setIsListening(false);
  };

  return (
    <div className="fixed bottom-24 right-8 w-96 bg-white rounded-3xl shadow-2xl border border-indigo-100 flex flex-col z-[100] animate-in slide-in-from-right-8 duration-300 overflow-hidden">
      <div className="bg-indigo-600 p-4 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            {isListening ? <Mic className="animate-pulse" size={20} /> : <MicOff size={20} />}
          </div>
          <div>
            <h3 className="font-bold text-sm leading-tight">{t('live_transcription')}</h3>
            <p className="text-[10px] opacity-80 uppercase tracking-widest font-bold">
              {isListening ? t('listening') : t('disconnected')}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 min-h-[300px] max-h-[500px] overflow-y-auto p-4 space-y-4 bg-gray-50/50">
        <div className="text-xs text-gray-400 text-center mb-2 px-6 font-medium italic">
          {t('live_chat_init')}
        </div>
        
        {transcript.map((m, i) => (
          <div key={i} className={`flex ${m.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm shadow-sm ${
              m.type === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
            }`}>
              {m.text}
            </div>
          </div>
        ))}

        {currentInput && (
          <div className="flex justify-end">
            <div className="max-w-[85%] px-4 py-2 rounded-2xl bg-indigo-100 text-indigo-700 text-sm italic rounded-tr-none animate-pulse">
              {currentInput}
            </div>
          </div>
        )}

        {currentOutput && (
          <div className="flex justify-start">
            <div className="max-w-[85%] px-4 py-2 rounded-2xl bg-white border border-indigo-200 text-gray-700 text-sm italic rounded-tl-none">
              <div className="flex items-center gap-2 mb-1">
                <Volume2 size={12} className="animate-bounce" />
                <span className="text-[10px] font-bold uppercase">{t('ai_speaking')}</span>
              </div>
              {currentOutput}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-100 flex items-center gap-3 bg-white">
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full bg-indigo-600 transition-all duration-300 ${isListening ? 'w-full animate-pulse' : 'w-0'}`} />
        </div>
        <button 
          onClick={onClose}
          className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all active:scale-95"
        >
          {t('stop_discussion')}
        </button>
      </div>
    </div>
  );
};

export default LiveTranscriptionPanel;
