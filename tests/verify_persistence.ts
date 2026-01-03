
// VERIFICATION SCRIPT
// Usage: npx tsx tests/verify_persistence.ts

import { createChromePolyfill } from './chrome_polyfill';

// 1. Setup Global Environment (Polyfill)
createChromePolyfill();

// 2. Import System Under Test (SUT)
const main = async () => {
    // Import System Under Test (SUT)
    // Dynamic imports ensure they load AFTER the polyfill is set
    const { useStore } = await import('../store/useStore');
    const { db } = await import('../services/db');
    const { ProjectController } = await import('../services/ProjectController');

    console.log('--- STARTING VERIFICATION ---');

    console.log('[1/4] Clearing DB...');
    await db.projects.clear();
    await db.users.clear();

    console.log('[2/4] Initializing Controller & Store...');
    const controller = new ProjectController();
    
    // Set initial store state
    useStore.setState({
        currentUser: { 
            id: 'script-user', 
            name: 'ScriptRunner',
            email: 'test@test.com',
            avatar: '',
            color: '#000000'
        },
        project: {
            id: 'script-project',
            drawings: [],
            textAnnotations: [],
            synapses: [],
            layers: [],
            activeLayerId: 'default',
            title: 'Script Project',
            url: 'http://test.com',
            content: '',
            ownerId: 'script-user',
            updatedAt: Date.now(),
            collaborators: []
        },
        activeTool: 'cursor' as any
    });

    console.log('[3/4] Simulating "SAVE_DRAWINGS" message from content script...');
    const mockDrawings = [
        { id: 'd-1', points: [{x:0,y:0}], color: 'red', type: 'pen' }
    ];

    // Simulate the message event
    // The Controller (initialized above) should be listening and updating the Store -> DB
    await (global as any).chrome._simulateMessage({
        action: 'SAVE_DRAWINGS',
        payload: mockDrawings
    });

    // Wait for async persistence (ProjectSlice -> saveProjectToDB)
    await new Promise(r => setTimeout(r, 1000));

    console.log('[4/4] Verifying Database State...');
    const savedProject = await db.projects.get('script-project');

    if (!savedProject) {
        console.error('FAIL: Project not found in DB!');
        process.exit(1);
    }

    if (savedProject.drawings.length === 1 && savedProject.drawings[0].id === 'd-1') {
        console.log('SUCCESS: Drawing persisted correctly!');
        console.log('Drawings in DB:', savedProject.drawings);
    } else {
        console.error('FAIL: Data mismatch in DB.');
        console.error('Expected:', mockDrawings);
        console.error('Found:', savedProject.drawings);
        process.exit(1);
    }

    console.log('--- VERIFICATION COMPLETE ---');
    process.exit(0);
};

main().catch(err => {
    console.error('FATAL ERROR:', err);
    process.exit(1);
});
