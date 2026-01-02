import React from 'react';
import { TextAnnotation } from '../types';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { sendToContentScript } from '../services/bridge';
import { getActiveTab } from '../services/extension';
import { useLanguage } from '../LanguageContext';
import { Edit, Trash2, MapPin } from 'lucide-react';

interface AnnotationListProps {
  annotations: TextAnnotation[];
  onEdit: (anno: TextAnnotation) => void;
  onDelete: (id: string) => void;
}

const AnnotationList: React.FC<AnnotationListProps> = ({ annotations, onEdit, onDelete }) => {
  const { t } = useLanguage();

  const handleJump = async (id: string) => {
    const tab = await getActiveTab();
    if (tab?.id) {
      sendToContentScript(tab.id, 'SCROLL_TO_HIGHLIGHT', { id });
    }
  };

  if (annotations.length === 0) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center text-muted-foreground h-full min-h-[50vh]">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <Edit className="w-8 h-8 opacity-20" />
        </div>
        <p className="max-w-[200px] leading-relaxed text-sm">
          {t('no_highlights')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4 pb-20">
      {annotations.map((anno) => (
        <Card 
            key={anno.id} 
            className="group cursor-pointer hover:shadow-md transition-all border-l-[3px]"
            style={{ borderLeftColor: anno.color }}
            onClick={() => handleJump(anno.id)}
        >
          <CardContent className="p-3 space-y-2.5">
            <blockquote className="text-sm border-l-2 border-transparent pl-0 text-foreground/90 font-serif leading-relaxed line-clamp-4">
              "{anno.text}"
            </blockquote>
            
            {anno.comment && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
                <span className="font-bold shrink-0 text-[10px] uppercase tracking-wider mt-0.5 opacity-70">{t('note_label')}:</span>
                <span>{anno.comment}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
               <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                 <MapPin size={10} />
                 {t('click_to_jump')}
               </span>
               <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 rounded-full hover:bg-secondary" 
                    onClick={() => onEdit(anno)}
                >
                  <Edit size={12} />
                </Button>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950/30" 
                    onClick={() => onDelete(anno.id)}
                >
                  <Trash2 size={12} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AnnotationList;
