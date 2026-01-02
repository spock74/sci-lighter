import { StateCreator } from 'zustand';
import { AppState, AuthSlice } from '../types';
import { db } from '../../services/db';

export const createAuthSlice: StateCreator<AppState, [], [], AuthSlice> = (set) => ({
  currentUser: (() => {
    try {
      return JSON.parse(localStorage.getItem('scilighter_user') || 'null');
    } catch (error) {
      console.warn('Could not access localStorage. Running in a sandboxed environment.');
      return null;
    }
  })(),
  setCurrentUser: (user) => {
    try {
      if (user) {
        localStorage.setItem('scilighter_user', JSON.stringify(user));
        db.users.put(user);
      } else {
        localStorage.removeItem('scilighter_user');
      }
    } catch (error) {
      console.warn('Could not access localStorage. Running in a sandboxed environment.');
    }
    set({ currentUser: user });
  },
});
