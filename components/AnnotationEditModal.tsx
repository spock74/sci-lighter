
import React, { useState } from 'react';
import { Save, MessageSquare, Palette, Trash2, BrainCircuit } from 'lucide-react';
import { TextAnnotation } from '../types';
import { useLanguage } from '../LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface AnnotationEditModalProps {
  annotation: TextAnnotation;
  onSave: (updates: Partial<TextAnnotation>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  onVoiceDiscussion?: (anno: TextAnnotation) => void;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#000000'];

const AnnotationEditModal: React.FC<AnnotationEditModalProps> = ({
  annotation,
  onSave,
  onDelete,
  onClose,
  onVoiceDiscussion
}) => {
  const { t } = useLanguage();
  const [comment, setComment] = useState(annotation.comment || '');
  const [color, setColor] = useState(annotation.color);

  const handleSave = () => {
    onSave({ comment, color });
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
             <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10 text-primary">
               <MessageSquare size={18} />
             </div>
             {t('edit_annotation')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4 pr-2">
            
            {/* Selected Text Display */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('annotation_text')}</label>
              <div className="p-4 bg-muted/50 rounded-md border border-border italic text-sm text-foreground/80 leading-relaxed">
                "{annotation.text}"
              </div>
            </div>

            {/* Comment Input */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('annotation_comment')}</label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t('synthesis_placeholder')}
                className="min-h-[120px] resize-none"
              />
            </div>

             {/* Version History Section */}
            {annotation.history && annotation.history.length > 0 && (
            <div className="space-y-3 pt-2">
               <Separator />
               <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                 <BrainCircuit size={12} /> Version History
               </label>
               <div className="pl-2 space-y-0 relative">
                  {/* Vertical Line */}
                  <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border rounded-full"></div>
                  
                  {annotation.history.map((ver, idx) => (
                      <div key={ver.id} className="relative pl-6 py-2 group">
                          {/* Dot */}
                          <div className="absolute left-[7px] top-3.5 w-2.5 h-2.5 rounded-full bg-muted border-2 border-background z-10 group-hover:bg-primary transition-colors"></div>
                          
                          <div className="text-[10px] text-muted-foreground font-mono mb-0.5 flex items-center gap-2">
                             <span>{new Date(ver.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="text-xs text-foreground/90 bg-muted/30 p-2 rounded-lg border border-border/50">
                             {ver.content}
                          </div>
                      </div>
                  ))}
               </div>
            </div>
          )}

          {/* Color Picker */}
          <div className="space-y-3">
             <Separator />
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Palette size={12} /> {t('highlighter_tool')}
            </label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-8 h-8 rounded-full border-2 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    color === c ? "border-foreground scale-110 shadow-md" : "border-transparent"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex sm:justify-between items-center w-full gap-2 sm:gap-0 mt-4 border-t pt-4">
           {/* Left side actions wrapped in a div/fragment properly? Shadcn footer is flex-col sm:flex-row usually. */}
           <Button
              variant="destructive"
              size="icon"
              onClick={() => onDelete(annotation.id)}
              className="mr-auto shrink-0"
              title={t('delete')}
           >
              <Trash2 size={18} />
           </Button>

           <div className="flex gap-2 w-full sm:w-auto justify-end">
              {onVoiceDiscussion && (
                 <Button
                    variant="secondary"
                    onClick={() => { onVoiceDiscussion(annotation); onClose(); }}
                    className="gap-2"
                 >
                    <BrainCircuit size={16} /> {t('start_discussion')}
                 </Button>
              )}
             <Button onClick={handleSave} className="gap-2">
                <Save size={16} /> {t('save_changes')}
             </Button>
           </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AnnotationEditModal;
