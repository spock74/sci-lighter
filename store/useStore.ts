
import { create } from 'zustand';
import { AppState } from './types';
import { createAuthSlice } from './slices/authSlice';
import { createUISlice } from './slices/uiSlice';
import { createProjectSlice } from './slices/projectSlice';

export const useStore = create<AppState>((...a) => ({
  ...createAuthSlice(...a),
  ...createUISlice(...a),
  ...createProjectSlice(...a),
}));

