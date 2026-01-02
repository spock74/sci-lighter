
import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  AnnotationProject, 
  DrawingPath, 
  TextAnnotation, 
  Layer, 
  AnnotationVariant, 
  Synapse,
  User,
  ToolType
} from '../types';
import { broadcastUpdate, subscribeToUpdates, saveToCloud, loadFromCloud } from '../services/cloud';

const DEFAULT_LAYER_ID = 'layer-default';

interface HistoryState {
  drawings: DrawingPath[];
  textAnnotations: TextAnnotation[];
  layers: Layer[];
  activeLayerId: string;
}

export const useProjectState = (currentUser: User | null, initialProject: AnnotationProject) => {
  const [project, setProject] = useState<AnnotationProject>(initialProject);
  const [history, setHistory] = useState<AnnotationProject[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [stagedAnnotationIds, setStagedAnnotationIds] = useState<string[]>([]);

  // Undo/Redo Stacks
  const [undoStack, setUndoStack] = useState<HistoryState[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryState[]>([]);

  const pushToUndo = useCallback(() => {
    setUndoStack(prev => [...prev, { 
      drawings: project.drawings, 
      textAnnotations: project.textAnnotations,
      layers: project.layers,
      activeLayerId: project.activeLayerId
    }]);
    setRedoStack([]);
  }, [project]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const lastState = undoStack[undoStack.length - 1];
    setRedoStack(prev => [...prev, { 
      drawings: project.drawings, 
      textAnnotations: project.textAnnotations,
      layers: project.layers,
      activeLayerId: project.activeLayerId
    }]);
    setUndoStack(prev => prev.slice(0, -1));
    setProject(prev => ({
      ...prev,
      drawings: lastState.drawings,
      textAnnotations: lastState.textAnnotations,
      layers: lastState.layers,
      activeLayerId: lastState.activeLayerId
    }));
  }, [undoStack, project]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const nextState = redoStack[redoStack.length - 1];
    setUndoStack(prev => [...prev, { 
      drawings: project.drawings, 
      textAnnotations: project.textAnnotations,
      layers: project.layers,
      activeLayerId: project.activeLayerId
    }]);
    setRedoStack(prev => prev.slice(0, -1));
    setProject(prev => ({
      ...prev,
      drawings: nextState.drawings,
      textAnnotations: nextState.textAnnotations,
      layers: nextState.layers,
      activeLayerId: nextState.activeLayerId
    }));
  }, [redoStack, project]);

  // Cloud & Sync Logic
  useEffect(() => {
    if (!currentUser) return;
    const fetchCloudData = async () => {
      const projects = await loadFromCloud(currentUser.id);
      setHistory(projects);
      const existing = projects.find(p => p.id === project.id);
      if (existing) setProject(existing);
    };
    fetchCloudData();

    const unsubscribe = subscribeToUpdates((data) => {
      if (data.projectId === project.id) {
        setProject(prev => {
          if (data.type === 'DRAWING_ADD') return { ...prev, drawings: [...prev.drawings, data.drawing] };
          if (data.type === 'TEXT_ADD') return { ...prev, textAnnotations: [...prev.textAnnotations, data.annotation] };
          if (data.type === 'SYNAPSE_ADD') return { ...prev, synapses: [...prev.synapses, data.synapse] };
          if (data.type === 'CLEAR') return { ...prev, drawings: [] };
          return prev;
        });
      }
    });
    return () => unsubscribe();
  }, [currentUser, project.id]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (currentUser) {
        setIsSyncing(true);
        await saveToCloud(project);
        setIsSyncing(false);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [project, currentUser]);

  // Actions
  const applyHighlight = useCallback((text: string, variant: AnnotationVariant, color: string) => {
    pushToUndo();
    const fragment = `#:~:text=${encodeURIComponent(text.substring(0, 100))}`;
    const newAnnotation: TextAnnotation = {
      id: crypto.randomUUID(),
      text,
      color,
      timestamp: Date.now(),
      startOffset: 0,
      endOffset: 0,
      authorId: currentUser?.id,
      variant,
      url: project.url,
      pageTitle: project.title,
      fragmentUrl: project.url + fragment
    };
    setProject(prev => ({ ...prev, textAnnotations: [...prev.textAnnotations, newAnnotation] }));
    broadcastUpdate(project.id, { type: 'TEXT_ADD', annotation: newAnnotation });
  }, [project, currentUser, pushToUndo]);

  const addSynapse = useCallback((sourceId: string, targetId: string, conclusion: string) => {
    const newSynapse: Synapse = {
      id: crypto.randomUUID(),
      sourceAnnotationId: sourceId,
      targetAnnotationId: targetId,
      conclusion,
      timestamp: Date.now(),
      authorId: currentUser?.id || 'anon'
    };
    setProject(prev => ({ ...prev, synapses: [...prev.synapses, newSynapse] }));
    broadcastUpdate(project.id, { type: 'SYNAPSE_ADD', synapse: newSynapse });
  }, [project, currentUser]);

  const addLayer = useCallback(() => {
    pushToUndo();
    const newLayer = { id: crypto.randomUUID(), name: `Layer ${project.layers.length + 1}`, visible: true, locked: false };
    setProject(prev => ({ ...prev, layers: [...prev.layers, newLayer], activeLayerId: newLayer.id }));
  }, [project, pushToUndo]);

  return {
    project,
    setProject,
    history,
    isSyncing,
    stagedAnnotationIds,
    setStagedAnnotationIds,
    undoStack,
    redoStack,
    handleUndo,
    handleRedo,
    applyHighlight,
    addSynapse,
    addLayer,
    pushToUndo
  };
};
