import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStore } from 'zustand';
import { createProjectSlice } from './projectSlice';
import { AppState } from '../types';

// Mock dependencies
vi.mock('../../services/db', () => ({
    saveProjectToDB: vi.fn(),
}));
vi.mock('../../services/cloud', () => ({
    broadcastUpdate: vi.fn(),
}));

describe('Project Slice', () => {
    let useTestStore: any;

    beforeEach(() => {
        vi.clearAllMocks();
        
        // minimal mock of other slices
        useTestStore = createStore<AppState>((set, get, api) => ({
            // @ts-ignore - partial implementation for testing
            ...createProjectSlice(set, get, api),
            currentUser: { id: 'user-1', name: 'Test User', email: 'test@test.com', avatar: '' },
            currentColor: '#ff0000',
        }));
    });

    it('should initialize with default project', () => {
        const state = useTestStore.getState();
        expect(state.project.id).toBe('default');
        expect(state.project.textAnnotations).toHaveLength(0);
    });

    it('addTextAnnotation should add annotation and push to undo stack', () => {
        const store = useTestStore;
        
        store.getState().addTextAnnotation('Hello World', 'highlight');

        const state = store.getState();
        expect(state.project.textAnnotations).toHaveLength(1);
        expect(state.project.textAnnotations[0].text).toBe('Hello World');
        expect(state.undoStack).toHaveLength(1);
    });

    it('undo should revert text annotation addition', () => {
        const store = useTestStore;
        
        store.getState().addTextAnnotation('To be deleted', 'highlight');
        expect(store.getState().project.textAnnotations).toHaveLength(1);

        store.getState().undo();
        
        const state = store.getState();
        expect(state.project.textAnnotations).toHaveLength(0);
        expect(state.redoStack).toHaveLength(1);
    });

    it('redo should re-apply text annotation addition', () => {
        const store = useTestStore;
        
        store.getState().addTextAnnotation('To be restored', 'highlight');
        store.getState().undo();
        expect(store.getState().project.textAnnotations).toHaveLength(0);

        store.getState().redo();
        
        const state = store.getState();
        expect(state.project.textAnnotations).toHaveLength(1);
        expect(state.project.textAnnotations[0].text).toBe('To be restored');
    });
});
