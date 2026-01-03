import React from 'react';
import { createRoot } from 'react-dom/client';
import Mark from 'mark.js';
import { Readability } from '@mozilla/readability';
import { BridgeAction, BridgeMessage, SelectionPayload, ScrollPayload, LocalePayload } from './services/bridge';
import PageOverlay from './components/PageOverlay';

console.log("Sci-Lighter: Content script loading (React Mode)...");

// --- Global State ---
let markInstance: any = null;
let currentLocale: 'en' | 'pt' = 'en';

// --- Mount React Overlay ---
const mountOverlay = () => {
    const overlayId = 'sci-lighter-overlay-root';
    if (document.getElementById(overlayId)) return;

    const overlayContainer = document.createElement('div');
    overlayContainer.id = overlayId;
    document.body.appendChild(overlayContainer);

    const root = createRoot(overlayContainer);
    root.render(<PageOverlay />);
    console.log("Sci-Lighter: PageOverlay mounted");
};

// Mount immediately
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountOverlay);
} else {
    mountOverlay();
}


// --- Message Listener (REGISTER FIRST) ---
chrome.runtime.onMessage.addListener((request: BridgeMessage, sender, sendResponse) => {
    // console.log("Sci-Lighter: Received message", request.action);

    if (request.action === 'PING') {
        sendResponse('PONG');
        return true;
    }

    if (request.action === 'SYNC_LOCALE') {
        const payload = request.payload as LocalePayload;
        currentLocale = payload.locale;
        console.log("Sci-Lighter: Locale synced to", currentLocale);
        return true;
    }

    if (request.action === 'GET_PAGE_CONTENT') {
        try {
            const documentClone = document.cloneNode(true) as Document;
            const reader = new Readability(documentClone);
            const article = reader.parse();
            const fallback = document.querySelector('article') || document.body;
            
            sendResponse({
                title: article?.title || document.title,
                url: window.location.href,
                content: article?.content || fallback.innerText, 
                textContent: article?.textContent || fallback.innerText
            });
        } catch (e) {
            console.error("Sci-Lighter: Extraction Error", e);
            sendResponse(null);
        }
        return true;
    }

    if (request.action === 'SCROLL_TO_HIGHLIGHT') {
        try {
            const payload = request.payload as ScrollPayload;
            if (!payload.id) return;

            const mark = document.querySelector(`mark[data-annotation-id="${payload.id}"]`);
            if (mark) {
                mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
                mark.classList.add('ring-2', 'ring-offset-1', 'ring-blue-500');
                setTimeout(() => mark.classList.remove('ring-2', 'ring-offset-1', 'ring-blue-500'), 2000);
            }
        } catch (e) {
            console.error("Sci-Lighter: Scroll Error", e);
        }
        return true;
    }

    if (request.action === 'CREATE_HIGHLIGHT') {
        try {
            const payload = request.payload as any; // TextAnnotation type
            if (markInstance && payload.text) {
                console.log("Sci-Lighter: Creating highlight", payload.text);
                
                const options = {
                    className: `highlight-${payload.variant || 'highlight'}`,
                    each: (elem: HTMLElement) => {
                        elem.setAttribute('data-annotation-id', payload.id);
                        elem.style.cursor = 'pointer';
                        elem.style.color = 'inherit'; // Keep original text color
                        
                        // Apply styles based on variant
                        if (payload.variant === 'underline') {
                            elem.style.backgroundColor = 'transparent';
                            elem.style.borderBottom = `2px solid ${payload.color}`;
                            elem.style.paddingBottom = '1px';
                        } else {
                            // Highlight variant: Add transparency if color is hex
                            let color = payload.color;
                            if (color.startsWith('#') && color.length === 7) {
                                // Convert Hex to RGBA with 0.4 opacity for marker effect
                                const r = parseInt(color.slice(1, 3), 16);
                                const g = parseInt(color.slice(3, 5), 16);
                                const b = parseInt(color.slice(5, 7), 16);
                                color = `rgba(${r}, ${g}, ${b}, 0.4)`;
                            }
                            elem.style.backgroundColor = color;
                        }

                        // Add interaction
                        elem.addEventListener('click', (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log("Sci-Lighter: Highlight clicked", payload.id);
                            chrome.runtime.sendMessage({
                                action: 'HIGHLIGHT_CLICKED',
                                payload: { id: payload.id }
                            });
                        });
                    }
                };

                // Precision Mode: Use markRanges if offsets are available
                if (payload.startOffset !== undefined && payload.endOffset !== undefined && payload.startOffset >= 0) {
                     console.log("Sci-Lighter: Using precision marking", payload.startOffset, payload.endOffset);
                     markInstance.markRanges([{
                         start: payload.startOffset,
                         length: payload.endOffset - payload.startOffset
                     }], options);
                } else {
                    // Fallback Mode: Mark all occurrences
                    console.log("Sci-Lighter: Using text marking (fallback)");
                    markInstance.mark(payload.text, options);
                }
            }
            sendResponse({ success: true });
        } catch (e) {
            console.error("Sci-Lighter: Create Highlight Error", e);
            sendResponse({ success: false, error: (e as Error).message });
        }
        return true;
    }

    if (request.action === 'BATCH_CREATE_HIGHLIGHTS') {
        try {
            const annotations = request.payload as any[];
            if (markInstance && annotations && annotations.length > 0) {
                console.log(`Sci-Lighter: Batch creating ${annotations.length} highlights`);
                
                annotations.forEach(payload => {
                    const options = {
                        className: `highlight-${payload.variant || 'highlight'}`,
                        each: (elem: HTMLElement) => {
                            elem.setAttribute('data-annotation-id', payload.id);
                            elem.style.cursor = 'pointer';
                            elem.style.color = 'inherit';
                            
                            if (payload.variant === 'underline') {
                                elem.style.backgroundColor = 'transparent';
                                elem.style.borderBottom = `2px solid ${payload.color}`;
                                elem.style.paddingBottom = '1px';
                            } else {
                                let color = payload.color;
                                if (color.startsWith('#') && color.length === 7) {
                                    const r = parseInt(color.slice(1, 3), 16);
                                    const g = parseInt(color.slice(3, 5), 16);
                                    const b = parseInt(color.slice(5, 7), 16);
                                    color = `rgba(${r}, ${g}, ${b}, 0.4)`;
                                }
                                elem.style.backgroundColor = color;
                            }

                            elem.addEventListener('click', (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                chrome.runtime.sendMessage({
                                    action: 'HIGHLIGHT_CLICKED',
                                    payload: { id: payload.id }
                                });
                            });
                        }
                    };

                    if (payload.startOffset !== undefined && payload.endOffset !== undefined && payload.startOffset >= 0) {
                        markInstance.markRanges([{
                            start: payload.startOffset,
                            length: payload.endOffset - payload.startOffset
                        }], options);
                    } else {
                        markInstance.mark(payload.text, options);
                    }
                });
            }
            sendResponse({ success: true });
        } catch (e) {
            console.error("Sci-Lighter: Batch Create Error", e);
            sendResponse({ success: false, error: (e as Error).message });
        }
        return true;
    }

    if (request.action === 'UPDATE_HIGHLIGHT') {
         try {
            const payload = request.payload as any;
            const marks = document.querySelectorAll(`mark[data-annotation-id="${payload.id}"]`);
            marks.forEach((mark) => {
                const elem = mark as HTMLElement;
                if (payload.color) {
                    // Check if it's likely an underline based on existing style or class (simplified check)
                    const isUnderline = elem.classList.contains('highlight-underline');
                    
                    if (isUnderline) {
                        elem.style.borderBottomColor = payload.color;
                        elem.style.backgroundColor = 'transparent';
                    } else {
                        // Re-calculate rgba for update
                         let color = payload.color;
                         if (color.startsWith('#') && color.length === 7) {
                             const r = parseInt(color.slice(1, 3), 16);
                             const g = parseInt(color.slice(3, 5), 16);
                             const b = parseInt(color.slice(5, 7), 16);
                             color = `rgba(${r}, ${g}, ${b}, 0.4)`;
                         }
                        elem.style.backgroundColor = color;
                    }
                }
            });
            sendResponse({ success: true });
        } catch (e) {
             console.error("Sci-Lighter: Update Highlight Error", e);
             sendResponse({ success: false, error: (e as Error).message });
        }
        return true;
    }

    if (request.action === 'DELETE_HIGHLIGHT') {
        try {
             // mark.js doesn't easily "unmark" by ID without custom logic or unmark all and redraw.
             // Simple DOM removal for now:
             const payload = request.payload as { id: string };
             const marks = document.querySelectorAll(`mark[data-annotation-id="${payload.id}"]`);
             marks.forEach((mark) => {
                 const parent = mark.parentNode;
                 if (parent) {
                     parent.replaceChild(document.createTextNode(mark.textContent || ''), mark);
                     parent.normalize(); // Merge text nodes
                 }
             });
        } catch (e) {
             console.error("WebMark Pro: Delete Highlight Error", e);
        }
        return true;
    }

    // Pass through to React component if needed? 
    // Handled by React useEffect listener, so we don't need to do anything here except NOT block it.
    return false; // Allow other listeners
});

// --- Initialization ---
const initMark = () => {
    try {
        console.log("WebMark Pro: Initializing Mark.js");
        const context = document.querySelector('article') || document.body;
        markInstance = new Mark(context);
        console.log("WebMark Pro: Mark.js initialized");
    } catch (e) {
        console.error("WebMark Pro: Mark.js Initialization Failed", e);
    }
};

// --- Selection Handler ---
const handleSelection = () => {
    try {
        const selection = window.getSelection();
        if (!selection || selection.toString().trim().length === 0) return;

        const text = selection.toString().trim();
        let rangeData = undefined;

        // Calculate Global Offset for Precision
        try {
            const root = document.querySelector('article') || document.body;
            const range = selection.getRangeAt(0);
            const preSelectionRange = range.cloneRange();
            preSelectionRange.selectNodeContents(root);
            preSelectionRange.setEnd(range.startContainer, range.startOffset);
            const start = preSelectionRange.toString().length;
            
            rangeData = {
                start: start,
                length: text.length
            };
            console.log("Sci-Lighter: Captured selection at offset", start);
        } catch (e) {
            console.warn("Sci-Lighter: Failed to calculate offset", e);
        }
        
        chrome.runtime.sendMessage({
            action: 'TEXT_SELECTED' as BridgeAction,
            payload: { 
                text,
                range: rangeData
            } as SelectionPayload
        });
    } catch (e) {
        console.error("WebMark Pro: Selection Handle Error", e);
    }
};

let selectionTimeout: NodeJS.Timeout;
try {
    document.addEventListener('mouseup', () => {
        clearTimeout(selectionTimeout);
        selectionTimeout = setTimeout(handleSelection, 300);
    });
    
    // Initial Setup
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMark);
    } else {
        initMark();
    }
} catch (e) {
    console.error("WebMark Pro: Setup Error", e);
}

console.log("WebMark Pro: Content script loaded successfully");
