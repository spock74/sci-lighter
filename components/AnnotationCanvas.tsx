
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { DrawingPath, ToolType, Point, Layer, TextAnnotation } from '../types';
import { useTheme } from '../ThemeContext';

interface AnnotationCanvasProps {
  drawings: DrawingPath[];
  textAnnotations: TextAnnotation[];
  layers: Layer[];
  activeLayerId: string;
  selectedDrawingId: string | null;
  onSelectDrawing: (id: string | null) => void;
  onDrawingsChange: (drawings: DrawingPath[]) => void;
  onDeleteTextAnnotation: (id: string) => void;
  onUpdateTextAnnotation: (id: string, updates: Partial<TextAnnotation>) => void;
  activeTool: ToolType;
  currentColor: string;
  brushSize: number;
}

const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
  drawings,
  textAnnotations,
  layers,
  activeLayerId,
  selectedDrawingId,
  onSelectDrawing,
  onDrawingsChange,
  onDeleteTextAnnotation,
  onUpdateTextAnnotation,
  activeTool,
  currentColor,
  brushSize
}) => {
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const activeCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { tokens } = useTheme();
  
  // Interaction State - using refs for high-frequency updates to avoid re-renders
  const isDrawingRef = useRef(false);
  const currentPathRef = useRef<Point[]>([]);
  const requestRef = useRef<number>();
  
  // React state for UI updates (cursor, text input) that don't need 60fps
  const [isOverDrawing, setIsOverDrawing] = useState(false);
  const [eraserCursorPos, setEraserCursorPos] = useState<Point | null>(null);
  
  // Repositioning State
  const [isMoving, setIsMoving] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<Point | null>(null);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
  const [originalDrawing, setOriginalDrawing] = useState<DrawingPath | null>(null);

  // Floating Input State
  const [textInputPos, setTextInputPos] = useState<Point | null>(null);
  const [textInputValue, setTextInputValue] = useState('');
  const [linkedAnnotationId, setLinkedAnnotationId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Helper: Get bounds for hit testing - Memoized or Simplified
  const getPathBounds = useCallback((path: DrawingPath) => {
    const { points, text, width } = path;
    if (points.length === 0) return null;

    if (text) {
        // Approximate text bounds without canvas context for performance
        // Assuming ~0.6 aspect ratio for characters and fixed line height
        const fontSize = width * 4;
        const estimatedWidth = text.length * (fontSize * 0.6); 
        return { x: points[0].x, y: points[0].y, w: estimatedWidth, h: fontSize * 1.2 };
    }

    let minX = points[0].x;
    let minY = points[0].y;
    let maxX = points[0].x;
    let maxY = points[0].y;

    points.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    });

    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }, []);

  // ... (rest of component internal logic)

  // Compute pointer events style logic
  const getPointerEvents = () => {
      if (activeTool === ToolType.TEXT_ANNOTATOR) return 'none';
      if (activeTool === ToolType.CURSOR) return (isOverDrawing || isMoving) ? 'auto' : 'none';
      return 'auto'; // Pen, Eraser need events
  };



  const distToSegment = (p: Point, v: Point, w: Point) => {
    const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
    if (l2 === 0) return Math.sqrt(Math.pow(p.x - v.x, 2) + Math.pow(p.y - v.y, 2));
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.sqrt(
      Math.pow(p.x - (v.x + t * (w.x - v.x)), 2) +
      Math.pow(p.y - (v.y + t * (w.y - v.y)), 2)
    );
  };

  const isPointInPath = useCallback((p: Point, path: DrawingPath, customThreshold?: number) => {
    const bounds = getPathBounds(path);
    if (!bounds) return false;

    if (path.text) {
        const threshold = 15;
        return p.x >= bounds.x - threshold && 
               p.x <= bounds.x + bounds.w + threshold && 
               p.y >= bounds.y - threshold && 
               p.y <= bounds.y + bounds.h + threshold;
    }

    const threshold = customThreshold || Math.max(path.width / 2, 12);
    // Simple bounding box check first for performance
    if (p.x < bounds.x - threshold || p.x > bounds.x + bounds.w + threshold ||
        p.y < bounds.y - threshold || p.y > bounds.y + bounds.h + threshold) {
        return false;
    }

    for (let i = 0; i < path.points.length - 1; i++) {
      if (distToSegment(p, path.points[i], path.points[i+1]) < threshold) {
        return true;
      }
    }
    return false;
  }, [getPathBounds]);

  // Global mouse move for hover effects - throttled
  useEffect(() => {
    let lastTime = 0;
    const handleGlobalMove = (e: MouseEvent) => {
        const now = Date.now();
        if (now - lastTime < 50) return; // Throttle to 20fps for hover checks
        lastTime = now;

        const canvas = mainCanvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const over = drawings.some(d => {
            const layer = layers.find(l => l.id === d.layerId);
            return layer?.visible && isPointInPath({ x, y }, d);
        });
        
        setIsOverDrawing(over);
    };

    window.addEventListener('mousemove', handleGlobalMove);
    return () => window.removeEventListener('mousemove', handleGlobalMove);
  }, [drawings, layers, isPointInPath]);

  const drawPathSegments = (ctx: CanvasRenderingContext2D, points: Point[]) => {
    if (points.length < 2) return;
    ctx.moveTo(points[0].x, points[0].y);
    if (points.length === 2) {
      ctx.lineTo(points[1].x, points[1].y);
    } else {
      for (let i = 1; i < points.length - 2; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      const lastIndex = points.length - 1;
      ctx.quadraticCurveTo(
        points[lastIndex - 1].x,
        points[lastIndex - 1].y,
        points[lastIndex].x,
        points[lastIndex].y
      );
    }
  }

  const drawSmoothedPath = useCallback((ctx: CanvasRenderingContext2D, path: DrawingPath, isSelected = false, offset: Point = { x: 0, y: 0 }) => {
    const { points, color, width, tool, text } = path;
    if (points.length < 1) return;

    const offsetPoints = (offset.x === 0 && offset.y === 0) 
        ? points 
        : points.map(p => ({ x: p.x + offset.x, y: p.y + offset.y }));

    if (text) {
        ctx.save();
        if (isSelected) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = tokens.primary;
        }
        ctx.font = `bold ${width * 4}px Inter, sans-serif`;
        ctx.fillStyle = color;
        ctx.textBaseline = 'top';
        ctx.fillText(text, offsetPoints[0].x, offsetPoints[0].y);
        ctx.restore();
        return;
    }

    if (offsetPoints.length < 2) return;

    ctx.save();
    if (isSelected) {
        ctx.shadowBlur = 8;
        ctx.shadowColor = tokens.primary;
        ctx.beginPath();
        ctx.strokeStyle = `${tokens.primary}33`;
        ctx.lineWidth = width + 6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        drawPathSegments(ctx, offsetPoints);
        ctx.stroke();
    }
    ctx.beginPath();
    ctx.strokeStyle = tool === ToolType.HIGHLIGHTER ? `${color}44` : color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    drawPathSegments(ctx, offsetPoints);
    ctx.stroke();
    ctx.restore();
  }, [tokens.primary]);

  const drawSelectionIndicators = useCallback((ctx: CanvasRenderingContext2D, path: DrawingPath, offset: Point = { x: 0, y: 0 }) => {
    const bounds = getPathBounds(path);
    if (!bounds) return;

    const padding = path.text ? 4 : 12;
    const x = (bounds.x + offset.x) - padding;
    const y = (bounds.y + offset.y) - padding;
    const w = bounds.w + padding * 2;
    const h = bounds.h + padding * 2;

    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = `${tokens.primary}66`;
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = tokens.primary;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);
    ctx.fillStyle = `${tokens.primary}11`;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }, [getPathBounds, tokens.primary]);

  // STATIC CANVAS REDRAW - Only runs when drawings/layers/selection changes
  const redrawStatic = useCallback(() => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    layers.forEach(layer => {
      if (!layer.visible) return;
      const layerDrawings = drawings.filter(d => d.layerId === layer.id);
      layerDrawings.forEach(path => {
        // Skip calling detailed draw if moving (handled by active canvas or special logic)
        // But for "Two Canvas" usually easier to just filter out the moving one from static
        const isCurrentlyMovingThis = isMoving && selectedDrawingId === path.id;
        
        // If moving, we draw it on the Active canvas (or handle differently). 
        // For simplicity: Draw everything on static unless logic dictates otherwise.
        // If we want high perf move, we should NOT draw the moving item here.
        if (!isCurrentlyMovingThis) {
             drawSmoothedPath(ctx, path, selectedDrawingId === path.id);
        }
      });
    });
  }, [drawings, layers, isMoving, selectedDrawingId, drawSmoothedPath]);

  // ACTIVE CANVAS REDRAW - Runs on RAF during interaction
  const drawActiveFrame = useCallback(() => {
    const canvas = activeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw the current stroke being drawn
    if (isDrawingRef.current && currentPathRef.current.length > 1) {
       const activeLayer = layers.find(l => l.id === activeLayerId);
       if (activeLayer?.visible && !activeLayer?.locked && activeTool !== ToolType.ERASER && activeTool !== ToolType.TEXT_ANNOTATOR) {
           drawSmoothedPath(ctx, { 
               id: 'temp', 
               points: currentPathRef.current, 
               color: currentColor, 
               width: brushSize, 
               tool: activeTool, 
               layerId: activeLayerId 
           }, false);
       }
    }

    // 2. Draw the item being moved/dragged
    if (isMoving && selectedDrawingId && originalDrawing) {
        // Verify selection still exists
        // eslint-disable-next-line
        drawSmoothedPath(ctx, originalDrawing, true, dragOffset);
        drawSelectionIndicators(ctx, originalDrawing, dragOffset);
    } else if (selectedDrawingId && !isMoving) {
        // If selected but NOT moving, the static draw handles the path, 
        // but we might want the indicators on active to avoid static redraws? 
        // For now, let's leave indicators on static for simplicity, OR static redraw handles non-moving selection.
        const selected = drawings.find(d => d.id === selectedDrawingId);
        if (selected) drawSelectionIndicators(ctx, selected);
    }

    // 3. Draw Eraser Cursor
    if (activeTool === ToolType.ERASER && eraserCursorPos) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(eraserCursorPos.x, eraserCursorPos.y, brushSize * 1.5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(100, 100, 100, 0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

  }, [layers, activeLayerId, activeTool, currentColor, brushSize, isMoving, originalDrawing, dragOffset, selectedDrawingId, drawings, eraserCursorPos, drawSmoothedPath, drawSelectionIndicators]);


  // Effect to update Static Canvas when data changes
  useEffect(() => {
    redrawStatic();
    // Also trigger one active frame to ensure selection indicators update if needed
    drawActiveFrame();
  }, [redrawStatic, drawActiveFrame]);

  // Resize Handler
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && mainCanvasRef.current && activeCanvasRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        mainCanvasRef.current.width = clientWidth;
        mainCanvasRef.current.height = clientHeight;
        activeCanvasRef.current.width = clientWidth;
        activeCanvasRef.current.height = clientHeight;
        redrawStatic();
        drawActiveFrame();
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial size
    return () => window.removeEventListener('resize', handleResize);
  }, [redrawStatic, drawActiveFrame]);


  const handleEraserAtPoint = useCallback((p: Point, clientX: number, clientY: number) => {
    const eraserRadius = brushSize * 2;
    const remaining = drawings.filter(d => {
      const layer = layers.find(l => l.id === d.layerId);
      if (layer?.locked || !layer?.visible) return true;
      return !isPointInPath(p, d, eraserRadius);
    });
    
    if (remaining.length !== drawings.length) {
      onDrawingsChange(remaining);
    }

    // Eraser logic for DOM elements (Text Annotations)
    // Temporarily disable pointer events to check element below
    if (activeCanvasRef.current) {
        activeCanvasRef.current.style.pointerEvents = 'none';
        const elementUnder = document.elementFromPoint(clientX, clientY);
        activeCanvasRef.current.style.pointerEvents = 'auto'; // Restore (class handles this but good to be safe)

        if (elementUnder && elementUnder.classList.contains('page-text-mark')) {
            const annoId = elementUnder.getAttribute('data-annotation-id');
            if (annoId) {
             onUpdateTextAnnotation(annoId, { comment: '' });
            }
        }
    }
  }, [drawings, layers, brushSize, isPointInPath, onDrawingsChange, onUpdateTextAnnotation]);

  // INPUT HANDLERS
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (activeTool !== ToolType.CURSOR) {
        // e.preventDefault(); // Sometimes prevents touch scroll, careful
    }

    const rect = activeCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    let x, y, cx, cy;
    if ('touches' in e) {
      cx = e.touches[0].clientX;
      cy = e.touches[0].clientY;
      x = cx - rect.left;
      y = cy - rect.top;
    } else {
      cx = (e as React.MouseEvent).clientX;
      cy = (e as React.MouseEvent).clientY;
      x = cx - rect.left;
      y = cy - rect.top;
    }

    if (activeTool === ToolType.CURSOR) {
        let hitId: string | null = null;
        // Check reverse order (topmost first)
        for (let i = drawings.length - 1; i >= 0; i--) {
            const drawing = drawings[i];
            const layer = layers.find(l => l.id === drawing.layerId);
            if (layer?.visible && isPointInPath({ x, y }, drawing)) {
                hitId = drawing.id;
                break;
            }
        }
        onSelectDrawing(hitId);
        if (hitId) {
            const hitDrawing = drawings.find(d => d.id === hitId);
            if (hitDrawing) {
                setIsMoving(true);
                setDragStartPos({ x, y });
                setDragOffset({ x: 0, y: 0 });
                setOriginalDrawing(hitDrawing);
                // Force sync redraw of static to hide the moving item
                // Wait... redrawStatic depends on isMoving. 
                // We need to trigger it. React setState is async.
                // The useEffect [isMoving] will handle it next frame.
            }
        }
        return;
    }

    if (activeTool === ToolType.ERASER) {
      onSelectDrawing(null); // Ensure we drop any selection so visual indicators don't confuse the user
      isDrawingRef.current = true;
      setEraserCursorPos({ x, y });
      handleEraserAtPoint({ x, y }, cx, cy);
      // Loop for eraser visual
      const loop = () => {
          if (isDrawingRef.current) {
             drawActiveFrame();
             requestRef.current = requestAnimationFrame(loop);
          }
      };
      loop();
      return;
    }

    if (activeTool === ToolType.TEXT_ANNOTATOR) {
        // Hit test for text
        if (activeCanvasRef.current) {
           activeCanvasRef.current.style.pointerEvents = 'none'; 
           const elementUnder = document.elementFromPoint(cx, cy);
           activeCanvasRef.current.style.pointerEvents = 'auto';

           if (elementUnder && elementUnder.classList.contains('page-text-mark')) {
             const annoId = elementUnder.getAttribute('data-annotation-id');
             if (annoId) {
               const anno = textAnnotations.find(a => a.id === annoId);
               setLinkedAnnotationId(annoId);
               setTextInputValue(anno?.comment || '');
             } else {
               setLinkedAnnotationId(null);
               setTextInputValue('');
             }
           } else {
             setLinkedAnnotationId(null);
             setTextInputValue('');
           }
        }
        setTextInputPos({ x, y });
        setTimeout(() => inputRef.current?.focus(), 50);
        return;
    }
    
    // DRAWING TOOL
    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (activeLayer?.locked || !activeLayer?.visible) return;

    isDrawingRef.current = true;
    currentPathRef.current = [{ x, y }]; // Init path via ref
    onSelectDrawing(null);

    // Start RAF loop
    const loop = () => {
        if (isDrawingRef.current) {
            drawActiveFrame();
            requestRef.current = requestAnimationFrame(loop);
        }
    };
    loop();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = activeCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    let x, y, cx, cy;
    if ('touches' in e) {
      cx = e.touches[0].clientX;
      cy = e.touches[0].clientY;
      x = cx - rect.left;
      y = cy - rect.top;
    } else {
      cx = (e as React.MouseEvent).clientX;
      cy = (e as React.MouseEvent).clientY;
      x = cx - rect.left;
      y = cy - rect.top;
    }

    if (isMoving && dragStartPos) {
        setDragOffset({ x: x - dragStartPos.x, y: y - dragStartPos.y });
        drawActiveFrame(); // Direct call for smooth drag
        return;
    }

    if (activeTool === ToolType.ERASER) {
      setEraserCursorPos({ x, y });
      if (isDrawingRef.current) {
        handleEraserAtPoint({ x, y }, cx, cy);
      } else {
        drawActiveFrame(); // Just cursor update
      }
      return;
    }

    if (!isDrawingRef.current) return;

    // Add point to ref (no re-render)
    const points = currentPathRef.current;
    const lastPoint = points[points.length - 1];
    if (lastPoint) {
        const dist = Math.sqrt(Math.pow(x - lastPoint.x, 2) + Math.pow(y - lastPoint.y, 2));
        if (dist > 1.5) {
            currentPathRef.current.push({ x, y });
            // RAF loop handles the draw
        }
    }
  };

  const endDrawing = () => {
    if (isMoving && originalDrawing && (dragOffset.x !== 0 || dragOffset.y !== 0)) {
        const updatedDrawings = drawings.map(d => {
            if (d.id === originalDrawing.id) {
                return {
                    ...d,
                    points: d.points.map(p => ({ x: p.x + dragOffset.x, y: p.y + dragOffset.y }))
                };
            }
            return d;
        });
        onDrawingsChange(updatedDrawings);
    }
    
    setIsMoving(false);
    setDragStartPos(null);
    setDragOffset({ x: 0, y: 0 });
    setOriginalDrawing(null);

    // Stop RAF
    if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
    }

    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    setEraserCursorPos(null);
    drawActiveFrame(); // Clear active canvas

    if (activeTool === ToolType.ERASER) return;
    if (activeTool === ToolType.TEXT_ANNOTATOR) return;

    // Persist the drawing
    if (currentPathRef.current.length > 1) {
      const newPath: DrawingPath = {
        id: crypto.randomUUID(),
        points: [...currentPathRef.current],
        color: currentColor,
        width: brushSize,
        tool: activeTool,
        layerId: activeLayerId
      };
      onDrawingsChange([...drawings, newPath]);
    }
    currentPathRef.current = [];
  };

  const handleTextInputSubmit = () => {
    if (textInputValue.trim() && textInputPos) {
        if (linkedAnnotationId) {
            onUpdateTextAnnotation(linkedAnnotationId, { comment: textInputValue.trim() });
        } else {
             const newDrawing: DrawingPath = {
                id: crypto.randomUUID(),
                points: [textInputPos],
                color: currentColor,
                width: brushSize,
                tool: ToolType.TEXT_ANNOTATOR,
                layerId: activeLayerId,
                text: textInputValue.trim()
            };
            onDrawingsChange([...drawings, newDrawing]);
        }
    }
    setTextInputPos(null);
    setTextInputValue('');
    setLinkedAnnotationId(null);
  };

  const cursorClass = activeTool === ToolType.CURSOR 
    ? (isMoving ? 'cursor-grabbing' : isOverDrawing ? 'cursor-grab' : 'cursor-default') 
    : (activeTool === ToolType.ERASER ? 'cursor-none' : 'cursor-crosshair');

  // Global Click Handler for Text Annotator (since visual layer is pass-through)
  useEffect(() => {
    if (activeTool !== ToolType.TEXT_ANNOTATOR) return;

    const handleClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        // Check if clicked ON a mark
        if (target.classList.contains('page-text-mark')) {
            const annoId = target.getAttribute('data-annotation-id');
            if (annoId) {
                const anno = textAnnotations.find(a => a.id === annoId);
                setLinkedAnnotationId(annoId);
                setTextInputValue(anno?.comment || '');
                // Position input near the mark
                const rect = target.getBoundingClientRect();
                const containerRect = activeCanvasRef.current?.getBoundingClientRect();
                if (containerRect) {
                     setTextInputPos({ 
                         x: rect.left - containerRect.left, 
                         y: rect.top - containerRect.top 
                     });
                     setTimeout(() => inputRef.current?.focus(), 50);
                }
            }
        } else {
             // Clicked elsewhere? Maybe close input if open.
             // We allow default browser selection, so we don't interfere.
             // But if input was open, maybe close it?
             if (textInputPos) {
                 // handled by blur? 
             }
        }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [activeTool, textAnnotations, textInputPos]);

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none">
       {/* STATIC CANVAS - Bottom layer, stored drawings */}
      <canvas
        ref={mainCanvasRef}
        className="absolute inset-0 z-10 pointer-events-none"
      />
      
      {/* ACTIVE CANVAS - Top layer, current interactions */}
      <canvas
        ref={activeCanvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={endDrawing}
        onMouseLeave={endDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={endDrawing}
        className={`absolute inset-0 z-20 ${cursorClass}`}
        style={{ pointerEvents: getPointerEvents() }}
      />
      
      {textInputPos && (
        <div 
          className="fixed z-[100] pointer-events-auto animate-in zoom-in duration-150"
          style={{ 
            left: textInputPos.x + (activeCanvasRef.current?.getBoundingClientRect().left || 0), 
            top: textInputPos.y + (activeCanvasRef.current?.getBoundingClientRect().top || 0) - 20 
          }}
        >
          <div className={`bg-white/90 backdrop-blur-md border-2 ${linkedAnnotationId ? 'border-amber-500' : 'border-indigo-500'} rounded-xl shadow-2xl p-1 flex items-center min-w-[240px]`}>
            {linkedAnnotationId && <div className="pl-3 pr-1 text-[8px] font-black text-amber-600 uppercase">Insight:</div>}
            <input
              ref={inputRef}
              type="text"
              value={textInputValue}
              onChange={(e) => setTextInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTextInputSubmit();
                if (e.key === 'Escape') setTextInputPos(null);
              }}
              onBlur={handleTextInputSubmit}
              placeholder={linkedAnnotationId ? "Add insight to highlight..." : "Type label text..."}
              className="flex-1 bg-transparent border-none outline-none px-3 py-2 text-sm font-bold text-gray-800 placeholder:text-gray-400"
            />
            <div className={`px-3 text-[9px] font-bold ${linkedAnnotationId ? 'text-amber-600 bg-amber-50' : 'text-indigo-600 bg-indigo-50'} rounded-lg py-1 uppercase tracking-tighter mr-1`}>Enter</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnotationCanvas;
