
import React from 'react';
import { Highlighter, Underline as UnderlineIcon } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

interface SelectionMenuProps {
  position: { x: number; y: number };
  onHighlight: () => void;
  onUnderline: () => void;
}

const SelectionMenu: React.FC<SelectionMenuProps> = ({ position, onHighlight, onUnderline }) => {
  const { t } = useLanguage();

  return (
    <div 
      className="fixed z-[200] -translate-x-1/2 -translate-y-full mb-4 animate-in zoom-in duration-200 selection-menu-target" 
      style={{ left: position.x, top: position.y }}
    >
      <div className="flex items-center bg-gray-900 text-white rounded-full shadow-2xl p-1 gap-1 border border-white/10 backdrop-blur-md">
        <button 
          onMouseDown={(e) => { e.preventDefault(); onHighlight(); }} 
          className="p-2.5 hover:bg-white/20 rounded-full flex items-center gap-2 px-4 transition-colors"
        >
          <Highlighter size={16} className="text-yellow-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider">{t('highlight_only')}</span>
        </button>
        <div className="w-px h-4 bg-white/10" />
        <button 
          onMouseDown={(e) => { e.preventDefault(); onUnderline(); }} 
          className="p-2.5 hover:bg-white/20 rounded-full flex items-center gap-2 px-4 transition-colors"
        >
          <UnderlineIcon size={16} className="text-indigo-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider">{t('underline')}</span>
        </button>
      </div>
    </div>
  );
};

export default SelectionMenu;
