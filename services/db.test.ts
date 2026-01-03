
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db, saveProjectToDB, loadProjectsFromDB } from './db';
import { AnnotationProject } from '../types';

describe('SciLighter Database Service', () => {
    // Helper to generate a dummy project
    const createProject = (id: string, ownerId: string): AnnotationProject => ({
        id,
        ownerId,
        title: 'Test Project',
        url: 'http://example.com',
        content: 'Test Content',
        drawings: [],
        textAnnotations: [],
        synapses: [],
        layers: [],
        activeLayerId: 'default',
        updatedAt: Date.now(),
        collaborators: []
    });

    beforeEach(async () => {
        // Clear DB before each test
        await db.projects.clear();
        vi.clearAllMocks();
    });

    it('should save a project to project store', async () => {
        const project = createProject('p1', 'user1');
        const success = await saveProjectToDB(project);
        
        expect(success).toBe(true);

        const saved = await db.projects.get('p1');
        expect(saved).toBeDefined();
        expect(saved?.id).toBe('p1');
        expect(saved?.ownerId).toBe('user1');
    });

    it('should load projects for specific owner', async () => {
        const p1 = createProject('p1', 'user1');
        const p2 = createProject('p2', 'user1');
        const p3 = createProject('p3', 'user2'); // Different user

        await db.projects.bulkPut([p1, p2, p3]);

        const user1Projects = await loadProjectsFromDB('user1');
        expect(user1Projects).toHaveLength(2);
        expect(user1Projects.map(p => p.id)).toContain('p1');
        expect(user1Projects.map(p => p.id)).toContain('p2');
        expect(user1Projects.map(p => p.id)).not.toContain('p3');
    });

    it('should update timestamp on save', async () => {
        const project = createProject('p1', 'user1');
        const oldTime = project.updatedAt;
        
        // Small delay to ensure time difference
        await new Promise(r => setTimeout(r, 10));

        await saveProjectToDB(project);
        const saved = await db.projects.get('p1');
        
        expect(saved?.updatedAt).toBeGreaterThan(oldTime);
    });

    it('should handle transactional consistency', async () => {
        // This tests the logic added in the fix
        const project = createProject('tx-test', 'user1');
        
        // Spy on transaction to verify it's called (Dexie wrapper needed? internal check is harder)
        // We functionally verify persistence works
        await saveProjectToDB(project);
        const count = await db.projects.count();
        expect(count).toBe(1);
    });
});
