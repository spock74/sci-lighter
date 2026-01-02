
import React from 'react';
import { ChevronRight, Search, BrainCircuit, Share2, Sun, Moon } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { useTheme } from '../ThemeContext';

interface MainHeaderProps {
  url: string;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  isWorkbenchOpen: boolean;
  onToggleWorkbench: () => void;
  onShare: () => void;
}

const MainHeader: React.FC<MainHeaderProps> = ({
  url,
  isSidebarOpen,
  onToggleSidebar,
  isWorkbenchOpen,
  onToggleWorkbench,
  onShare
}) => {
  const { t, locale, setLocale } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="glass-header p-3 flex items-center justify-between z-30 sticky top-0">
      <div className="flex items-center gap-4 flex-1">
        <button onClick={onToggleSidebar} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-muted transition-colors">
          <ChevronRight className={`transition-transform duration-300 ${isSidebarOpen ? 'rotate-180' : ''}`} size={20} />
        </button>
        <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2 flex-1 max-w-2xl border border-transparent focus-within:bg-surface focus-within:border-primary/30 transition-all shadow-inner">
          <Search size={16} className="text-muted mr-2" />
          <input type="text" readOnly value={url} className="bg-transparent border-none outline-none text-sm text-muted w-full font-medium" />
        </div>
      </div>
      <div className="flex items-center gap-3">
         {/* Theme Toggle */}
         <button 
           onClick={toggleTheme}
           className="p-2 text-muted hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
           title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
         >
           {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
         </button>

         {/* Language Toggle */}
         <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1 border border-border-subtle">
           <button 
             onClick={() => setLocale('en')}
             className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all ${locale === 'en' ? 'bg-surface text-primary shadow-sm' : 'text-muted hover:text-main'}`}
           >
             EN
           </button>
           <button 
             onClick={() => setLocale('pt')}
             className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all ${locale === 'pt' ? 'bg-surface text-primary shadow-sm' : 'text-muted hover:text-main'}`}
           >
             PT
           </button>
         </div>

         <button 
            onClick={onToggleWorkbench}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${isWorkbenchOpen ? 'bg-primary text-white shadow-lg' : 'bg-gray-100 dark:bg-gray-800 text-muted hover:bg-gray-200 dark:hover:bg-gray-700'}`}
         >
            <BrainCircuit size={16} /> {t('workbench_title')}
         </button>
         <button onClick={onShare} className="btn-primary flex items-center gap-2 text-sm active:scale-95">
            <Share2 size={16} /> {t('share')}
         </button>
      </div>
    </header>
  );
};

export default MainHeader;
