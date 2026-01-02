
import React, { useState, useMemo } from 'react';
import { 
  Quote, 
  Globe, 
  Search, 
  X, 
  Filter, 
  ExternalLink, 
  Pencil, 
  BrainCircuit, 
  Hash 
} from 'lucide-react';
import { TextAnnotation } from '../types';
import { useLanguage } from '../LanguageContext';

const HIGHLIGHT_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#000000'];

interface HighlightCardProps {
  annotation: TextAnnotation;
  showPageInfo: boolean;
  onStage: (anno: TextAnnotation) => void;
  onTeleport: (anno: TextAnnotation) => void;
  onEdit: (anno: TextAnnotation) => void;
}

const HighlightCard: React.FC<HighlightCardProps> = ({ annotation, showPageInfo, onStage, onTeleport, onEdit }) => {
  const { t } = useLanguage();
  return (
    <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm group hover:border-indigo-200 transition-all hover:shadow-md">
      <div className="flex items-center justify-between mb-1">
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: annotation.color }} />
        <span className="text-[8px] text-gray-400 font-bold uppercase">
          {new Date(annotation.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
        </span>
      </div>
      <p className="text-xs text-gray-800 font-medium mb-2 line-clamp-2 leading-relaxed italic">"{annotation.text}"</p>
      
      {showPageInfo && (
        <div className="flex items-center gap-1 text-[8px] text-gray-500 mb-2 truncate">
          <Hash size={8} /> {annotation.pageTitle}
        </div>
      )}

      <div className="flex justify-between items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={() => onStage(annotation)}
          className="p-1.5 text-indigo-600 bg-indigo-50 rounded-lg flex items-center gap-1 text-[10px] font-bold uppercase hover:bg-indigo-100 transition-colors"
        >
          <BrainCircuit size={12} /> {t('stage_for_comparison')}
        </button>
        <div className="flex gap-1">
          <button onClick={() => onTeleport(annotation)} className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
            <ExternalLink size={12} />
          </button>
          <button onClick={() => onEdit(annotation)} className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
            <Pencil size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

interface SidebarHighlightsProps {
  currentAnnotations: TextAnnotation[];
  globalAnnotations: TextAnnotation[];
  onStage: (anno: TextAnnotation) => void;
  onTeleport: (anno: TextAnnotation) => void;
  onEdit: (anno: TextAnnotation) => void;
}

type SortType = 'newest' | 'oldest' | 'alpha';

const SidebarHighlights: React.FC<SidebarHighlightsProps> = ({
  currentAnnotations,
  globalAnnotations,
  onStage,
  onTeleport,
  onEdit
}) => {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [colorFilter, setColorFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<SortType>('newest');
  const [scope, setHighlightScope] = useState<'current' | 'all'>('current');

  const filtered = useMemo(() => {
    let source = (scope === 'current' ? currentAnnotations : globalAnnotations) || [];
    
    if (search.trim()) {
      const q = search.toLowerCase();
      source = source.filter(a => a.text.toLowerCase().includes(q) || (a.comment && a.comment.toLowerCase().includes(q)));
    }

    if (colorFilter) {
      source = source.filter(a => a.color === colorFilter);
    }

    return [...source].sort((a, b) => {
      if (sort === 'newest') return b.timestamp - a.timestamp;
      if (sort === 'oldest') return a.timestamp - b.timestamp;
      if (sort === 'alpha') return a.text.localeCompare(b.text);
      return 0;
    });
  }, [scope, currentAnnotations, globalAnnotations, search, colorFilter, sort]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <Quote size={14} /> {t('my_highlights')}
        </h3>
        <button 
          onClick={() => setHighlightScope(scope === 'current' ? 'all' : 'current')}
          className={`p-1 rounded-md text-[10px] font-bold uppercase transition-colors ${scope === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}
          title={scope === 'all' ? t('filter_all_pages') : t('filter_current_page')}
        >
          <Globe size={12} />
        </button>
      </div>

      <div className="space-y-2 bg-gray-50 p-2 rounded-xl border border-gray-100">
        <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded-lg border border-gray-100 focus-within:border-indigo-300 transition-all">
          <Search size={12} className="text-gray-400" />
          <input 
            type="text" 
            placeholder={t('search_highlights')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-[10px] bg-transparent outline-none text-gray-700"
          />
          {search && <X size={12} className="text-gray-400 cursor-pointer" onClick={() => setSearch('')} />}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1">
            {HIGHLIGHT_COLORS.map(c => (
              <button 
                key={c}
                onClick={() => setColorFilter(colorFilter === c ? null : c)}
                className={`w-3 h-3 rounded-full transition-transform ${colorFilter === c ? 'scale-125 ring-2 ring-indigo-500' : 'hover:scale-110'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <select 
            value={sort}
            onChange={(e) => setSort(e.target.value as SortType)}
            className="text-[10px] bg-white border-none outline-none font-bold text-gray-500 cursor-pointer"
          >
            <option value="newest">{t('sort_newest')}</option>
            <option value="oldest">{t('sort_oldest')}</option>
            <option value="alpha">{t('sort_alpha')}</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        {filtered.length > 0 ? filtered.map(anno => (
          <HighlightCard 
            key={anno.id} 
            annotation={anno} 
            showPageInfo={scope === 'all'} 
            onStage={onStage} 
            onTeleport={onTeleport} 
            onEdit={onEdit} 
          />
        )) : (
          <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <Filter className="mx-auto text-gray-300 mb-2" size={24} />
            <p className="text-[10px] text-gray-400 font-medium px-4">{t('no_results')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SidebarHighlights;
