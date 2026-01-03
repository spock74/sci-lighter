
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStore } from '../useStore';
import { db } from '../../services/db';

// STRICT "SOCIABLE" TEST: NO MOCKS of internal logic.
// We use the REAL store, REAL slices, and REAL (in-memory) Database.

describe('Integration: Project Store <-> IndexedDB', () => {
    beforeEach(async () => {
        // Reset DB (Real In-Memory DB via fake-indexeddb)
        await db.projects.clear();
        await db.users.clear();
        localStorage.clear();
        
        // Reset Store Data (Merge, don't replace, to keep actions intact)
        useStore.setState({
            project: {
                id: 'default-test',
                title: '',
                url: '',
                content: '',
                drawings: [],
                textAnnotations: [],
                synapses: [],
                layers: [],
                activeLayerId: '',
                updatedAt: Date.now(),
                ownerId: 'test-user',
                collaborators: []
            },
            undoStack: [],
            redoStack: [],
            // Reset Auth
            currentUser: { id: 'test-user', name: 'Tester', email: 'test@test.com', avatar: '', color: '#000' }
        });
    });

    it('should persist new annotations to the database automatically', async () => {
        const store = useStore.getState();
        
        // Action: Add Annotation
        store.addTextAnnotation('Integration Test', 'highlight');

        // Verification 1: State Updated
        const updatedState = useStore.getState();
        expect(updatedState.project.textAnnotations).toHaveLength(1);
        const newAnno = updatedState.project.textAnnotations[0];
        expect(newAnno.text).toBe('Integration Test');

        // Verification 2: Persistence (The Real Test)
        // We wait a tiny bit because the DB write acts like a side effect in the slice
        await new Promise(r => setTimeout(r, 50)); 
        
        const storedProject = await db.projects.get(updatedState.project.id);
        expect(storedProject).toBeDefined();
        expect(storedProject?.textAnnotations).toHaveLength(1);
        expect(storedProject?.textAnnotations[0].id).toBe(newAnno.id);
    });

    it('should handle undo/redo by persisting state snapshots', async () => {
        const store = useStore.getState();
        
        // 1. Add
        store.addTextAnnotation('Step 1', 'highlight');
        await new Promise(r => setTimeout(r, 10)); // DB Sync
        
        const stateAfterAdd = useStore.getState();
        const pid = stateAfterAdd.project.id;

        // Verify DB has 1
        let p = await db.projects.get(pid);
        expect(p?.textAnnotations).toHaveLength(1);

        // 2. Undo
        useStore.getState().undo();
        await new Promise(r => setTimeout(r, 10)); // DB Sync

        // Verify DB has 0
        p = await db.projects.get(pid);
        expect(p?.textAnnotations).toHaveLength(0);

        // 3. Redo
        useStore.getState().redo();
        await new Promise(r => setTimeout(r, 10)); // DB Sync

        // Verify DB has 1 again
        p = await db.projects.get(pid);
        expect(p?.textAnnotations).toHaveLength(1);
    });

    // This test verifies the exact bug we were debugging (persistence failure)
    it('loadProject should align state with existing DB data', async () => {
        // Setup: Inject data directly into DB
        const existingProject: any = {
            id: 'legacy-id',
            title: 'Legacy Project',
            ownerId: 'test-user',
            updatedAt: Date.now(),
            textAnnotations: [{ 
                id: 'legacy-anno', 
                text: 'Old Note', 
                color: 'red', 
                timestamp: 123, 
                startOffset: 0, 
                endOffset: 5,
                url: 'http://test',
                pageTitle: 'Test' 
            }],
            drawings: [],
            synapses: [],
            layers: [],
            activeLayerId: '1',
            url: 'http://test',
            content: 'foo'
        };
        await db.projects.put(existingProject);

        // Action: Load Project
        useStore.getState().loadProject(existingProject);

        // Verify State matches
        const state = useStore.getState();
        expect(state.project.id).toBe('legacy-id');
        expect(state.project.textAnnotations[0].text).toBe('Old Note');
        
        // Verify we didn't wipe the DB
        const saved = await db.projects.get('legacy-id');
        expect(saved).toBeDefined();
        expect(saved?.textAnnotations).toHaveLength(1);
    });
});
