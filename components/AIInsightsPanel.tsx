
import React from 'react';
import { Sparkles, X, BrainCircuit, Share2, Download } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

interface AIInsightsPanelProps {
  result: string;
  onClose: () => void;
}

const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({ result, onClose }) => {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-indigo-600 p-6 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shadow-inner">
              <Sparkles size={24} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold leading-tight">{t('ai_insights_results')}</h2>
              <p className="text-xs opacity-70 uppercase tracking-widest font-bold">{t('collaborative_insights')}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 prose prose-indigo dark:prose-invert max-w-none">
          <div className="bg-indigo-50 dark:bg-indigo-950/30 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-900/50 mb-6">
            <div className="flex items-center gap-2 mb-4 text-indigo-600 dark:text-indigo-400">
              <BrainCircuit size={20} />
              <span className="text-sm font-bold uppercase tracking-tighter">Gemini Synthesis</span>
            </div>
            <div className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap font-medium">
              {result}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-black/20 flex gap-3 shrink-0">
          <button 
            onClick={() => alert('Exported to workspace')}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
          >
            <Download size={18} /> Export Results
          </button>
          <button 
            onClick={() => alert('Shared with collaborators')}
            className="px-6 py-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold hover:bg-gray-50 transition-all flex items-center gap-2"
          >
            <Share2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIInsightsPanel;
