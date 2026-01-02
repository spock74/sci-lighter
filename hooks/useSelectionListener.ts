import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { BridgeMessage, SelectionPayload } from '../services/bridge';

export const useSelectionListener = () => {
    // We no longer need activeTool checks here because the simple act of selecting text 
    // on the main page should trigger the option to highlight, regardless of a "tool" state 
    // in the sidebar (unless we want to enforce it).
    // For now, let's keep it simple: Selection -> Show UI.
    
    // Changing positional menu to a state-based UI trigger
    const [hasActiveSelection, setHasActiveSelection] = useState<boolean>(false);
    const [pendingSelectionText, setPendingSelectionText] = useState<string>('');
    const [pendingSelectionRange, setPendingSelectionRange] = useState<{start: number, length: number} | undefined>(undefined);

    useEffect(() => {
        const handleMessage = (request: BridgeMessage, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
            if (request.action === 'TEXT_SELECTED') {
                const payload = request.payload as SelectionPayload;
                if (payload.text) {
                    setPendingSelectionText(payload.text);
                    setPendingSelectionRange(payload.range); // Capture range
                    setHasActiveSelection(true);
                } else {
                    setHasActiveSelection(false);
                    setPendingSelectionText('');
                    setPendingSelectionRange(undefined);
                }
            }
        };

        chrome.runtime.onMessage.addListener(handleMessage);
        return () => chrome.runtime.onMessage.removeListener(handleMessage);
    }, []);

    const clearSelection = () => {
        setHasActiveSelection(false);
        setPendingSelectionText('');
        setPendingSelectionRange(undefined);
    };

    return { 
        hasActiveSelection, 
        pendingSelectionText,
        pendingSelectionRange,
        clearSelection
    };
};
