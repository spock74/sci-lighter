import { 
  ToolType, 
  AnnotationProject, 
  DrawingPath, 
  TextAnnotation, 
  User, 
  Synapse,
  AnnotationVariant,
  Layer
} from '../types';

export interface HistoryState {
  drawings: DrawingPath[];
  textAnnotations: TextAnnotation[];
  layers: Layer[];
  activeLayerId: string;
}

export interface AuthSlice {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
}

export interface UISlice {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  currentColor: string;
  setCurrentColor: (color: string) => void;
  brushSize: number;
  setBrushSize: (size: number) => void;
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isWorkbenchOpen: boolean;
  setWorkbenchOpen: (open: boolean) => void;
  selectedDrawingId: string | null;
  setSelectedDrawingId: (id: string | null) => void;
  isAnalyzing: boolean;
  setAnalyzing: (val: boolean) => void;
  isSyncing: boolean;
  setSyncing: (val: boolean) => void;
}

export interface ProjectSlice {
  project: AnnotationProject;
  history: AnnotationProject[];
  stagedAnnotationIds: string[];
  setProject: (projectUpdate: AnnotationProject | ((prev: AnnotationProject) => AnnotationProject)) => void;
  setHistory: (history: AnnotationProject[]) => void;
  loadProject: (project: AnnotationProject) => void;
  saveCurrentProject: () => Promise<void>;
  
  // Undo/Redo
  pushToUndo: () => void;
  undo: () => void;
  redo: () => void;
  undoStack: HistoryState[];
  redoStack: HistoryState[];

  // Actions
  addDrawing: (drawing: DrawingPath) => void;
  updateDrawing: (id: string, updates: Partial<DrawingPath>) => void;
  addTextAnnotation: (text: string, variant?: 'highlight' | 'underline', range?: { start: number, length: number }) => void;
  updateTextAnnotation: (id: string, updates: Partial<TextAnnotation>) => void;
  addSynapse: (sourceId: string, targetId: string, conclusion: string) => void;
  stageAnnotation: (id: string) => void;
  unstageAnnotation: (id: string) => void;
}

export type AppState = AuthSlice & UISlice & ProjectSlice;
