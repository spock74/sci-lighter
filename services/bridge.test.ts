import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendToContentScript, sendToRuntime, BridgeAction, TextAnnotationPayload } from './bridge';

// Mock chrome API is setup in setupTests.ts but we need to reset mocks between tests
describe('Bridge Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('sendToContentScript should call chrome.tabs.sendMessage with correct structure', async () => {
        const tabId = 123;
        const action: BridgeAction = 'HIGHLIGHT_TEXT';
        const payload: TextAnnotationPayload = {
            id: 'test-id',
            text: 'test text',
            color: '#ff0000',
            pageTitle: 'Test Page',
            url: 'http://test.com',
            timestamp: 123456789,
            notes: ''
        };

        await sendToContentScript(tabId, action, payload);

        expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(tabId, {
            action,
            payload
        });
    });

    it('sendToRuntime should call chrome.runtime.sendMessage with correct structure', async () => {
        const action: BridgeAction = 'PING';
        
        await sendToRuntime(action, {});

        expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
            action,
            payload: {}
        });
    });
});
