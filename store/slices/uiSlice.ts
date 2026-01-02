import { StateCreator } from 'zustand';
import { AppState, UISlice } from '../types';
import { ToolType } from '../../types';

export const createUISlice: StateCreator<AppState, [], [], UISlice> = (set) => ({
  activeTool: ToolType.CURSOR,
  setActiveTool: (tool) => set({ activeTool: tool, selectedDrawingId: null }),
  currentColor: '#22c55e',
  setCurrentColor: (color) => set({ currentColor: color }),
  brushSize: 4,
  setBrushSize: (size) => set({ brushSize: size }),
  isSidebarOpen: true,
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  isWorkbenchOpen: false,
  setWorkbenchOpen: (open) => set({ isWorkbenchOpen: open }),
  selectedDrawingId: null,
  setSelectedDrawingId: (id) => set({ selectedDrawingId: id }),
  isAnalyzing: false,
  setAnalyzing: (val) => set({ isAnalyzing: val }),
  isSyncing: false,
  setSyncing: (val) => set({ isSyncing: val }),
});
