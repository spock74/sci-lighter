import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import { vi } from 'vitest';

// Mock chrome API
global.chrome = {
    runtime: {
        sendMessage: vi.fn(),
        onMessage: {
            addListener: vi.fn(),
            removeListener: vi.fn()
        }
    },
    tabs: {
        query: vi.fn(),
        sendMessage: vi.fn(),
    },
    scripting: {
        executeScript: vi.fn()
    }
} as any;

// Mock BroadcastChannel for JSDOM
global.BroadcastChannel = class BroadcastChannel {
    name: string;
    onmessage: ((this: BroadcastChannel, ev: MessageEvent) => any) | null = null;
    constructor(name: string) {
        this.name = name;
    }
    postMessage(_message: any) {}
    close() {}
    addEventListener(_type: string, _listener: EventListenerOrEventListenerObject) {}
    removeEventListener(_type: string, _listener: EventListenerOrEventListenerObject) {}
    dispatchEvent(_event: Event): boolean { return true; }
} as any;

// Mock matchMedia for JSDOM
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
