import '@testing-library/jest-dom';

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
