import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type BusinessTag = 'general' | 'equifind' | 'home_inspection';

interface AppState {
  password: string | null;
  isAuthenticated: boolean;
  businessTag: BusinessTag;
  login: (password: string) => void;
  logout: () => void;
  setBusinessTag: (tag: BusinessTag) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      password: null,
      isAuthenticated: false,
      businessTag: 'general',
      login: (password) => set({ password, isAuthenticated: true }),
      logout: () => set({ password: null, isAuthenticated: false }),
      setBusinessTag: (tag) => set({ businessTag: tag }),
    }),
    {
      name: 'ai-hub-storage',
    }
  )
);
