
// Minimal Polyfill for Chrome Extension API in Node.js environment
// This allows business logic that relies on 'chrome.*' to run in standalone scripts.
import 'fake-indexeddb/auto';

type Listener = (message: any, sender: any, sendResponse: (response?: any) => void) => void;

interface ChromePolyfill {
    listeners: Listener[];
    
    runtime: {
        onMessage: {
            addListener: (fn: Listener) => void;
            removeListener: (fn: Listener) => void;
        };
        sendMessage: (message: any) => Promise<any>;
    };
    tabs: {
        query: (queryInfo: any, callback?: (tabs: any[]) => void) => Promise<any[]>; // Supports both callback and promise
        sendMessage: (tabId: number, message: any) => Promise<any>;
    };
    scripting: {
        executeScript: (injection: any) => Promise<void>;
    };
    extension: {
        inIncognitoContext: boolean;
    };
    // Helper to simulate incoming events
    _simulateMessage: (message: any) => Promise<void>;
}

export const createChromePolyfill = (): void => {
    const listeners: Listener[] = [];
    
    const polyfill: ChromePolyfill = {
        listeners,
        
        runtime: {
            onMessage: {
                addListener: (fn) => listeners.push(fn),
                removeListener: (fn) => {
                    const idx = listeners.indexOf(fn);
                    if (idx > -1) listeners.splice(idx, 1);
                }
            },
            sendMessage: async (_msg) => {/* echo */ return Promise.resolve()}
        },
        
        tabs: {
            query: async (_q, cb) => {
                const tabs = [{ id: 100, active: true, url: 'http://test.com' }];
                if (cb) cb(tabs); // Callback style
                return tabs;      // Promise style
            },
            sendMessage: async (_id, _msg) => Promise.resolve()
        },
        
        scripting: {
            executeScript: async () => {}
        },
        
        extension: {
            inIncognitoContext: false
        },

        // Test Helper
        _simulateMessage: async (message) => {
            for (const listener of listeners) {
                listener(message, {}, () => {});
            }
        }
    };

    // SAFETY: We are in a node script, global is available.
    (global as any).chrome = polyfill;
    
    // Polyfill navigator for DB service
    if (typeof navigator === 'undefined') {
        (global as any).navigator = {
            storage: {
                persist: async () => true,
                persisted: async () => true,
                estimate: async () => ({ quota: 1000, usage: 10 })
            },
            userAgent: 'Node/Test'
        };
    }
    
    // Polyfill window/self for Dexie if needed (Dexie usually checks for window/self)
    if (typeof self === 'undefined') {
        (global as any).self = global;
    }
    if (typeof window === 'undefined') {
        (global as any).window = global;
    }
};
