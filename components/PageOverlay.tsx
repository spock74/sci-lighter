import React, { useEffect, useState, useCallback } from 'react';
import AnnotationCanvas from './AnnotationCanvas';
import { DrawingPath, ToolType, Layer } from '../types';
import { BridgeAction, BridgeMessage } from '../services/bridge';

import { ThemeProvider } from '../ThemeContext';

const PageOverlay: React.FC = () => {
    const [drawings, setDrawings] = useState<DrawingPath[]>([]);
    const [tool, setTool] = useState<ToolType>(ToolType.CURSOR);
    const [isVisible, setIsVisible] = useState(true);
    
    // Default layers for the page - we might want to sync these too, but for now simple default
    const [layers] = useState<Layer[]>([
        { id: 'default', name: 'Page Layer', visible: true, locked: false }
    ]);
    const [activeLayerId] = useState('default');

    // Listen for messages from Side Panel / Background
    useEffect(() => {
        const handleMessage = (request: BridgeMessage, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
            if (request.action === 'SYNC_DRAWINGS') {
                console.log("PageOverlay: Syncing drawings", request.payload);
                setDrawings(request.payload || []);
            }
            if (request.action === 'SET_TOOL') {
                console.log("PageOverlay: Tool set to", request.payload);
                setTool(request.payload);
            }
            if (request.action === 'TOGGLE_OVERLAY') {
                setIsVisible(prev => !prev);
            }
        };

        chrome.runtime.onMessage.addListener(handleMessage);
        return () => chrome.runtime.onMessage.removeListener(handleMessage);
    }, []);

    const handleDrawingsChange = useCallback((newDrawings: DrawingPath[]) => {
        setDrawings(newDrawings);
        // Persist to DB via Background/SidePanel
        chrome.runtime.sendMessage({
            action: 'SAVE_DRAWINGS',
            payload: newDrawings
        });
    }, []);

    if (!isVisible) return null;

    return (
        <ThemeProvider>
            <div className="sci-lighter-overlay" style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 999999, // Below Side Panel (usually max z-index) but above page
                pointerEvents: 'none' // Let clicks pass through unless drawing
            }}>
                <AnnotationCanvas
                    drawings={drawings}
                    textAnnotations={[]} // Text annotations handled by mark.js for now? Or render them here too? 
                                         // User said "just as highlighting, be persisted". 
                                         // For now, let's focus on Drawings. mark.js handles text.
                    layers={layers}
                    activeLayerId={activeLayerId}
                    selectedDrawingId={null}
                    onSelectDrawing={() => {}}
                    onDrawingsChange={handleDrawingsChange}
                    onDeleteTextAnnotation={() => {}}
                    onUpdateTextAnnotation={() => {}}
                    activeTool={tool}
                    currentColor="#ef4444" // Default or sync? TODO: Sync color
                    brushSize={4} // TODO: Sync size
                />
            </div>
        </ThemeProvider>
    );
};

export default PageOverlay;
