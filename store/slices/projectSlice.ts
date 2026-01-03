import { StateCreator } from 'zustand';
import { AppState, ProjectSlice } from '../types';
import { TextAnnotation, Synapse } from '../../types';
import { saveProjectToDB } from '../../services/db';
import { broadcastUpdate } from '../../services/cloud';

export const createProjectSlice: StateCreator<AppState, [], [], ProjectSlice> = (set, get) => ({
  project: {
    id: 'default',
    title: '',
    url: '',
    content: '',
    drawings: [],
    textAnnotations: [],
    synapses: [],
    layers: [],
    activeLayerId: '',
    updatedAt: Date.now(),
    ownerId: 'anonymous',
    collaborators: []
  },
  history: [],
  stagedAnnotationIds: [],
  undoStack: [],
  redoStack: [],

  setProject: (projectUpdate) => {
    const nextProject = typeof projectUpdate === 'function' ? projectUpdate(get().project) : projectUpdate;
    console.log("Sci-Lighter: setProject called, saving to DB...", nextProject.id);
    set({ project: nextProject });
    saveProjectToDB(nextProject);
  },
  
  setHistory: (history) => set({ history }),

  loadProject: (project) => {
    set({ 
      project, 
      undoStack: [], 
      redoStack: [], 
      stagedAnnotationIds: [] 
    });
  },

  saveCurrentProject: async () => {
    set({ isSyncing: true });
    await saveProjectToDB(get().project);
    set({ isSyncing: false });
  },

  pushToUndo: () => {
    const { project } = get();
    set((state) => ({
      undoStack: [...state.undoStack, {
        drawings: project.drawings,
        textAnnotations: project.textAnnotations,
        layers: project.layers,
        activeLayerId: project.activeLayerId
      }],
      redoStack: []
    }));
  },

  undo: () => {
    const { undoStack, project } = get();
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    const nextProject = { ...project, ...last };
    set((state) => ({
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, {
        drawings: project.drawings,
        textAnnotations: project.textAnnotations,
        layers: project.layers,
        activeLayerId: project.activeLayerId
      }],
      project: nextProject
    }));
    saveProjectToDB(nextProject);
  },

  redo: () => {
    const { redoStack, project } = get();
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    const nextProject = { ...project, ...next };
    set((state) => ({
      redoStack: state.redoStack.slice(0, -1),
      undoStack: [...state.undoStack, {
        drawings: project.drawings,
        textAnnotations: project.textAnnotations,
        layers: project.layers,
        activeLayerId: project.activeLayerId
      }],
      project: nextProject
    }));
    saveProjectToDB(nextProject);
  },

  addDrawing: (drawing) => {
    get().pushToUndo();
    const nextProject = { ...get().project, drawings: [...get().project.drawings, drawing] };
    set({ project: nextProject });
    saveProjectToDB(nextProject);
    broadcastUpdate(nextProject.id, { type: 'DRAWING_ADD', drawing });
  },

  updateDrawing: (id, updates) => {
    get().pushToUndo();
    const nextProject = {
      ...get().project,
      drawings: get().project.drawings.map(d => d.id === id ? { ...d, ...updates } : d)
    };
    set({ project: nextProject });
    saveProjectToDB(nextProject);
  },

  addTextAnnotation: async (text, variant, range) => {
    get().pushToUndo();
    const { project, currentUser, currentColor } = get();
    const fragment = `#:~:text=${encodeURIComponent(text.substring(0, 100))}`;
    const newAnnotation: TextAnnotation = {
      id: crypto.randomUUID(),
      text,
      color: currentColor,
      timestamp: Date.now(),
      startOffset: range?.start || 0,
      endOffset: range ? (range.start + range.length) : 0,
      authorId: currentUser?.id,
      variant,
      url: project.url,
      pageTitle: project.title,
      fragmentUrl: project.url + fragment
    };
    const nextProject = { ...project, textAnnotations: [...project.textAnnotations, newAnnotation] };
    set({ project: nextProject });
    saveProjectToDB(nextProject);
    broadcastUpdate(project.id, { type: 'TEXT_ADD', annotation: newAnnotation });

    // Sync to Content Script
    try {
        const { getActiveTab } = await import('../../services/extension');
        const { sendToContentScript } = await import('../../services/bridge');
        const tab = await getActiveTab();
        if (tab?.id) {
            sendToContentScript(tab.id, 'CREATE_HIGHLIGHT', newAnnotation);
        }
    } catch (e) {
        console.error("Failed to sync highlight to page:", e);
    }
  },

  updateTextAnnotation: async (id, updates) => {
    get().pushToUndo();
    const project = get().project;
    const target = project.textAnnotations.find(a => a.id === id);
    
    // History Logic
    let newHistory = target?.history || [];
    if (target && updates.comment !== undefined && updates.comment !== target.comment && target.comment) { 
        newHistory = [
            ...newHistory,
            { id: crypto.randomUUID(), content: target.comment, timestamp: Date.now() }
        ];
    }
    
    const finalUpdates = { ...updates, history: newHistory };

    const nextProject = {
      ...project,
      textAnnotations: project.textAnnotations.map(a => a.id === id ? { ...a, ...finalUpdates } : a)
    };
    set({ project: nextProject });
    saveProjectToDB(nextProject);
    
    // Sync Update
    if (target) {
        try {
            const { getActiveTab } = await import('../../services/extension');
            const { sendToContentScript } = await import('../../services/bridge');
            const tab = await getActiveTab();
            if (tab?.id) {
                sendToContentScript(tab.id, 'UPDATE_HIGHLIGHT', { id, ...finalUpdates });
            }
        } catch (e) { console.error("Sync error:", e); }
    }
  },

  addSynapse: (sourceId, targetId, conclusion) => {
    const { project, currentUser } = get();
    const newSynapse: Synapse = {
      id: crypto.randomUUID(),
      sourceAnnotationId: sourceId,
      targetAnnotationId: targetId,
      conclusion,
      timestamp: Date.now(),
      authorId: currentUser?.id || 'anon'
    };
    const nextProject = { ...project, synapses: [...project.synapses, newSynapse] };
    set({ project: nextProject });
    saveProjectToDB(nextProject);
    broadcastUpdate(project.id, { type: 'SYNAPSE_ADD', synapse: newSynapse });
  },

  stageAnnotation: (id) => {
    set((state) => ({
      stagedAnnotationIds: state.stagedAnnotationIds.includes(id) 
        ? state.stagedAnnotationIds 
        : [...state.stagedAnnotationIds, id],
      isWorkbenchOpen: true
    }));
  },

  unstageAnnotation: (id) => {
    set((state) => ({
      stagedAnnotationIds: state.stagedAnnotationIds.filter(sid => sid !== id)
    }));
  }
});
