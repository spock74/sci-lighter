
import React, { useState } from 'react';
import { 
  Library, 
  ArrowRightLeft, 
  ExternalLink, 
  X, 
  Plus, 
  BrainCircuit, 
  Hash,
  ArrowRight
} from 'lucide-react';
import { TextAnnotation, Synapse } from '../types';
import { useLanguage } from '../LanguageContext';

interface StagedAnnotationProps {
  annotation: TextAnnotation;
  onTeleport: (anno: TextAnnotation) => void;
  onUnstage: (id: string) => void;
  isFirst: boolean;
  hasMultiple: boolean;
}

const StagedAnnotation: React.FC<StagedAnnotationProps> = ({ annotation, onTeleport, onUnstage, isFirst, hasMultiple }) => {
  const { t } = useLanguage();
  return (
    <div className="relative group">
      <div 
        className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/50 transition-all"
        style={{ borderLeftColor: annotation.color, borderLeftWidth: '4px' }}
      >
        <div className="flex justify-between items-start mb-2">
          <span className="text-[10px] font-bold text-gray-500 truncate max-w-[150px] flex items-center gap-1">
            <Hash size={10} /> {annotation.pageTitle}
          </span>
          <div className="flex gap-1">
            <button 
              onClick={() => onTeleport(annotation)}
              className="p-1 text-gray-500 hover:text-indigo-400 transition-colors"
              title={t('teleport_to_source')}
            >
              <ExternalLink size={12} />
            </button>
            <button 
              onClick={() => onUnstage(annotation.id)}
              className="p-1 text-gray-500 hover:text-red-400 transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-300 line-clamp-3 leading-relaxed italic">"{annotation.text}"</p>
      </div>
      {isFirst && hasMultiple && (
        <div className="flex justify-center -my-2 relative z-10">
          <div className="bg-indigo-600 p-1.5 rounded-full text-white shadow-lg border-2 border-gray-900">
            <ArrowRightLeft size={12} />
          </div>
        </div>
      )}
    </div>
  );
};

interface SynapseCardProps {
  synapse: Synapse;
  source?: TextAnnotation;
  target?: TextAnnotation;
}

const SynapseCard: React.FC<SynapseCardProps> = ({ synapse, source, target }) => {
  if (!source || !target) return null;
  return (
    <div className="p-5 bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 rounded-3xl relative overflow-hidden group hover:from-amber-500/20 transition-all">
      <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-100 transition-opacity">
        <BrainCircuit size={24} className="text-amber-500" />
      </div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: source.color }} />
        <div className="h-px flex-1 bg-white/10" />
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: target.color }} />
      </div>
      <p className="text-sm text-amber-50 font-medium leading-relaxed mb-4">
        {synapse.conclusion}
      </p>
      <div className="flex gap-2 text-[9px] text-gray-500 font-bold uppercase">
        <span className="bg-black/40 px-2 py-1 rounded-md">{source.pageTitle}</span>
        <span className="bg-black/40 px-2 py-1 rounded-md">{target.pageTitle}</span>
      </div>
    </div>
  );
};

interface WorkbenchProps {
  stagedAnnotations: TextAnnotation[];
  allAnnotations: TextAnnotation[];
  synapses: Synapse[];
  onUnstage: (id: string) => void;
  onAddSynapse: (sourceId: string, targetId: string, conclusion: string) => void;
  onTeleport: (annotation: TextAnnotation) => void;
  onClose: () => void;
}

const Workbench: React.FC<WorkbenchProps> = ({
  stagedAnnotations,
  allAnnotations,
  synapses,
  onUnstage,
  onAddSynapse,
  onTeleport,
  onClose
}) => {
  const { t } = useLanguage();
  const [conclusion, setConclusion] = useState('');

  const handleSynthesize = () => {
    if (stagedAnnotations.length < 2 || !conclusion.trim()) return;
    onAddSynapse(stagedAnnotations[0].id, stagedAnnotations[1].id, conclusion);
    setConclusion('');
    onUnstage(stagedAnnotations[0].id);
    onUnstage(stagedAnnotations[1].id);
  };

  return (
    <div className="w-96 bg-gray-900 border-l border-white/10 flex flex-col h-full shadow-2xl z-40 relative animate-in slide-in-from-right duration-300">
      <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
            <BrainCircuit size={20} />
          </div>
          <div>
            <h2 className="text-white font-bold">{t('workbench_title')}</h2>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">{t('comparative_study')}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('workbench_desc')}</h3>
            <span className="text-xs text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded-full font-bold">
              {stagedAnnotations.length} / 2
            </span>
          </div>

          <div className="space-y-3">
            {stagedAnnotations.map((anno, idx) => (
              <StagedAnnotation 
                key={anno.id} 
                annotation={anno} 
                onTeleport={onTeleport} 
                onUnstage={onUnstage} 
                isFirst={idx === 0} 
                hasMultiple={stagedAnnotations.length > 1} 
              />
            ))}

            {stagedAnnotations.length === 0 && (
              <div className="p-8 border-2 border-dashed border-white/5 rounded-3xl text-center">
                <Library className="mx-auto text-gray-700 mb-3" size={32} />
                <p className="text-xs text-gray-600 px-4">{t('no_staging')}</p>
              </div>
            )}
          </div>
        </div>

        {stagedAnnotations.length >= 2 && (
          <div className="bg-indigo-600/10 rounded-3xl p-6 border border-indigo-500/20 animate-in zoom-in duration-300">
            <h4 className="text-sm font-bold text-indigo-400 mb-4 flex items-center gap-2">
              <Plus size={16} /> {t('create_synapse')}
            </h4>
            <textarea
              value={conclusion}
              onChange={(e) => setConclusion(e.target.value)}
              placeholder={t('synthesis_placeholder')}
              className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500 transition-all mb-4 h-32 resize-none shadow-inner"
            />
            <button
              disabled={!conclusion.trim()}
              onClick={handleSynthesize}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-indigo-900/20 active:scale-95"
            >
              {t('done')} <ArrowRight size={16} />
            </button>
          </div>
        )}

        <div className="space-y-4 pt-4 border-t border-white/5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('synapses_count')}</h3>
          <div className="space-y-3">
            {synapses.map(syn => (
              <SynapseCard 
                key={syn.id} 
                synapse={syn} 
                source={allAnnotations.find(a => a.id === syn.sourceAnnotationId)}
                target={allAnnotations.find(a => a.id === syn.targetAnnotationId)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Workbench;
