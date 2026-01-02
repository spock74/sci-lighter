export const getActiveTab = async (): Promise<chrome.tabs.Tab | null> => {
    try {
        // For Side Panel, lastFocusedWindow is more reliable than currentWindow
        const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        return tabs[0] || null;
    } catch (error) {
        console.error("Error getting active tab:", error);
        return null;
    }
};

export const getPageContent = async (tabId: number, retries = 3, suppressErrors = false): Promise<{ title: string, url: string, content: string } | null> => {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await chrome.tabs.sendMessage(tabId, { action: 'GET_PAGE_CONTENT' });
            if (response) return response;
        } catch (error) {
            // Ignore specific error if we have retries left
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, 300 * (i + 1))); // Exponential-ish backoff
                continue;
            }
            if (!suppressErrors) {
                console.error("Error getting page content (script likely not ready):", error);
            }
        }
    }
    return null;
};

export const ensureContentConnection = async (tabId: number, maxAttempts = 100): Promise<boolean> => {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const response = await chrome.tabs.sendMessage(tabId, { action: 'PING' });
            if (response === 'PONG') return true;
        } catch {
            // Wait 100ms before next attempt
            await new Promise(r => setTimeout(r, 100));
        }
    }
    return false;
};

export const injectContentScript = async (tabId: number) => {
    try {
        await chrome.scripting.executeScript({
            target: { tabId },
            files: ['loader.js']
        });
    } catch (error) {
        console.error("Failed to inject content script:", error);
    }
};
