
import React from 'react';
import { 
  Plus, 
  Eye, 
  EyeOff, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Layers, 
  Edit2,
  Lock,
  Unlock
} from 'lucide-react';
import { Layer } from '../types';
import { useLanguage } from '../LanguageContext';

interface LayersPanelProps {
  layers: Layer[];
  activeLayerId: string;
  onAddLayer: () => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onDeleteLayer: (id: string) => void;
  onReorder: (id: string, direction: 'up' | 'down') => void;
  onRenameLayer: (id: string, name: string) => void;
  onSetActiveLayer: (id: string) => void;
}

const LayersPanel: React.FC<LayersPanelProps> = ({
  layers,
  activeLayerId,
  onAddLayer,
  onToggleVisibility,
  onToggleLock,
  onDeleteLayer,
  onReorder,
  onRenameLayer,
  onSetActiveLayer
}) => {
  const { t } = useLanguage();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <Layers size={14} /> {t('layers')}
        </h3>
        <button 
          onClick={onAddLayer}
          className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
          title={t('add_layer')}
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
        {[...layers].reverse().map((layer, index, array) => {
          const isFirst = index === 0;
          const isLast = index === array.length - 1;
          const isActive = layer.id === activeLayerId;

          return (
            <div 
              key={layer.id}
              onClick={() => onSetActiveLayer(layer.id)}
              className={`group flex flex-col p-2 rounded-xl border transition-all cursor-pointer ${
                isActive 
                  ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200 shadow-sm' 
                  : 'bg-white border-gray-100 hover:border-indigo-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); onToggleVisibility(layer.id); }}
                  className={`p-1 rounded-md transition-colors ${layer.visible ? 'text-gray-400 hover:text-indigo-600' : 'text-indigo-600 bg-indigo-50'}`}
                  title={t('visibility_toggle')}
                >
                  {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>

                <div className="flex-1 min-w-0">
                  <input 
                    type="text"
                    value={layer.name}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => onRenameLayer(layer.id, e.target.value)}
                    className="w-full bg-transparent border-none text-xs font-bold text-gray-700 outline-none focus:text-indigo-600 truncate"
                  />
                </div>

                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    disabled={isFirst}
                    onClick={(e) => { e.stopPropagation(); onReorder(layer.id, 'up'); }}
                    className="p-1 text-gray-400 hover:text-indigo-600 disabled:opacity-0"
                  >
                    <ChevronUp size={12} />
                  </button>
                  <button 
                    disabled={isLast}
                    onClick={(e) => { e.stopPropagation(); onReorder(layer.id, 'down'); }}
                    className="p-1 text-gray-400 hover:text-indigo-600 disabled:opacity-0"
                  >
                    <ChevronDown size={12} />
                  </button>
                  <button 
                    disabled={layers.length <= 1}
                    onClick={(e) => { e.stopPropagation(); onDeleteLayer(layer.id); }}
                    className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-0"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              
              {isActive && (
                <div className="flex items-center justify-between mt-1 px-1">
                  <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-tighter">{t('active_layer')}</span>
                  <div className="flex items-center gap-2">
                     <button 
                      onClick={(e) => { e.stopPropagation(); onToggleLock(layer.id); }}
                      className="text-gray-400 hover:text-gray-600"
                     >
                        {layer.locked ? <Lock size={10} /> : <Unlock size={10} />}
                     </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LayersPanel;
