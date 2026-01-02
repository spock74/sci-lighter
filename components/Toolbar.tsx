
import React, { useState, useEffect, useRef } from 'react';
import { 
  Pencil, 
  Highlighter, 
  Eraser, 
  Type, 
  MousePointer2, 
  Trash2, 
  Save, 
  Sparkles,
  CloudCheck,
  CloudUpload,
  Undo2,
  Redo2,
  GripVertical,
  HelpCircle,
  Palette,
  Circle
} from 'lucide-react';
import { ToolType } from '../types';
import { useLanguage } from '../LanguageContext';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface ToolbarProps {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  currentColor: string;
  setCurrentColor: (color: string) => void;
  brushSize: number;
  setBrushSize: (size: number) => void;
  onClear: () => void;
  onSave: () => void;
  onAnalyze: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isAnalyzing: boolean;
  isSyncing: boolean;
}

const COLORS = [
  '#ef4444', 
  '#f97316', 
  '#eab308', 
  '#22c55e', 
  '#3b82f6', 
  '#a855f7', 
  '#000000', 
];

const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  setActiveTool,
  currentColor,
  setCurrentColor,
  brushSize,
  setBrushSize,
  onClear,
  onSave,
  onAnalyze,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  isAnalyzing,
  isSyncing
}) => {
  const { t } = useLanguage();
  const toolbarRef = useRef<HTMLDivElement>(null);
  
  // Draggable State
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });

  // Initialize position to bottom center
  useEffect(() => {
    const handleInitialPos = () => {
      const x = window.innerWidth / 2;
      const y = window.innerHeight - 80;
      setPosition({ x, y });
    };
    handleInitialPos();
    window.addEventListener('resize', handleInitialPos);
    return () => window.removeEventListener('resize', handleInitialPos);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target instanceof Element && e.target.closest('button')) return;
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newX = e.clientX - dragStartPos.current.x;
      const newY = e.clientY - dragStartPos.current.y;
      
      const clampedX = Math.max(100, Math.min(window.innerWidth - 100, newX));
      const clampedY = Math.max(50, Math.min(window.innerHeight - 50, newY));
      
      setPosition({ x: clampedX, y: clampedY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div 
      ref={toolbarRef}
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`,
        transform: 'translate(-50%, -50%)',
        position: 'fixed'
      }}
      className={cn(
        "flex items-center gap-1 p-2 bg-background/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl z-50 transition-shadow",
        isDragging && "shadow-primary/20 cursor-grabbing ring-1 ring-primary"
      )}
    >
      {/* Drag Handle */}
      <div 
        onMouseDown={handleMouseDown}
        className="cursor-grab active:cursor-grabbing px-2 text-muted-foreground hover:text-foreground"
      >
        <GripVertical size={16} />
      </div>
      
      <Separator orientation="vertical" className="h-8" />

      {/* Tool Selection */}
      <div className="flex items-center gap-1 px-1">
        <ToolButton 
          active={activeTool === ToolType.CURSOR} 
          onClick={() => setActiveTool(ToolType.CURSOR)}
          icon={<MousePointer2 size={18} />}
          tooltip={t('navigate')}
        />
        <ToolButton 
          active={activeTool === ToolType.PEN} 
          onClick={() => setActiveTool(ToolType.PEN)}
          icon={<Pencil size={18} />}
          tooltip={t('pen_tool')}
        />
        <ToolButton 
          active={activeTool === ToolType.HIGHLIGHTER} 
          onClick={() => setActiveTool(ToolType.HIGHLIGHTER)}
          icon={<Highlighter size={18} />}
          tooltip={t('highlighter_tool')}
        />
        <ToolButton 
          active={activeTool === ToolType.TEXT_ANNOTATOR} 
          onClick={() => setActiveTool(ToolType.TEXT_ANNOTATOR)}
          icon={<Type size={18} />}
          tooltip={t('text_annotator')}
        />
        <ToolButton 
          active={activeTool === ToolType.ERASER} 
          onClick={() => setActiveTool(ToolType.ERASER)}
          icon={<Eraser size={18} />}
          tooltip={t('eraser')}
        />
      </div>

      <Separator orientation="vertical" className="h-8" />

      {/* History Controls */}
      <div className="flex items-center gap-1 px-1">
        <Button variant="ghost" size="icon" onClick={onUndo} disabled={!canUndo} title={t('undo')} className="h-9 w-9">
          <Undo2 size={18} />
        </Button>
        <Button variant="ghost" size="icon" onClick={onRedo} disabled={!canRedo} title={t('redo')} className="h-9 w-9">
          <Redo2 size={18} />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-8" />

      {/* Attributes: Color & Size */}
      <div className="flex items-center gap-2 px-2">
        {/* Color Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-full p-0 border-2" style={{ borderColor: currentColor }}>
              <div className="w-full h-full rounded-full" style={{ backgroundColor: currentColor }} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" side="top">
            <div className="flex flex-wrap gap-2 justify-center">
               {COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setCurrentColor(color)}
                  className={cn(
                    "w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                    currentColor === color ? "border-primary" : "border-transparent"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Brush Size Slider Popover (Click to adjust) */}
         <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-9 min-w-[3rem] px-2 font-mono text-xs gap-1">
               <Circle size={Math.max(8, brushSize / 2)} fill={currentColor} strokeWidth={0} />
               {brushSize}px
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-4" side="top">
             <div className="space-y-3">
               <div className="flex justify-between items-center text-xs text-muted-foreground">
                 <span>{t('brush_size') || "Size"}</span>
                 <span>{brushSize}px</span>
               </div>
               <Slider 
                 value={[brushSize]} 
                 min={1} 
                 max={48} 
                 step={1} 
                 onValueChange={(vals) => setBrushSize(vals[0])} 
               />
             </div>
          </PopoverContent>
        </Popover>
      </div>

      <Separator orientation="vertical" className="h-8" />

      {/* Actions */}
      <div className="flex items-center gap-1 pl-1">
        <div className="mr-2 flex items-center justify-center w-8" title={isSyncing ? t('syncing') : t('all_saved')}>
           {isSyncing ? <CloudUpload size={18} className="animate-pulse text-primary" /> : <CloudCheck size={18} className="text-green-500" />}
        </div>
        
        <div className="relative group/analyze">
           <Button 
            onClick={onAnalyze} 
            disabled={isAnalyzing} 
            variant="default" // Primary
            size="sm"
            className="gap-2 shadow-sm"
          >
            <Sparkles size={16} className={isAnalyzing ? 'animate-pulse' : ''} />
            {isAnalyzing ? t('analyzing') : t('ai_insights_btn')}
          </Button>

           {/* Tooltip via Popover/Overlay? Just custom hover for now */}
           <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-48 p-3 bg-popover text-popover-foreground text-[10px] rounded-xl opacity-0 invisible group-hover/analyze:opacity-100 group-hover/analyze:visible transition-all shadow-xl z-50 pointer-events-none border border-border">
             <div className="flex items-start gap-2">
               <HelpCircle size={14} className="text-primary shrink-0" />
               <p className="leading-relaxed">{t('ai_insights_help')}</p>
             </div>
           </div>
        </div>

        <Button variant="ghost" size="icon" onClick={onClear} title={t('clear_all')} className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
          <Trash2 size={18} />
        </Button>
        <Button variant="ghost" size="icon" onClick={onSave} title={t('sync_manually')} className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10">
          <Save size={18} />
        </Button>
      </div>
    </div>
  );
};

interface ToolButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  tooltip: string;
  disabled?: boolean;
}

const ToolButton: React.FC<ToolButtonProps> = ({ active, onClick, icon, tooltip, disabled }) => (
  <Button
    variant={active ? "secondary" : "ghost"}
    size="icon"
    onClick={onClick}
    title={tooltip}
    disabled={disabled}
    className={cn(
      "h-9 w-9 transition-all",
      active && "shadow-sm border border-border bg-secondary text-secondary-foreground"
    )}
  >
    {icon}
  </Button>
);

export default Toolbar;
