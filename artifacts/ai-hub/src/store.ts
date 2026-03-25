import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type BusinessTag = 'general' | 'equifind' | 'home_inspection';

export interface Account {
  workspace: string;
  displayName: string;
  businessTag: BusinessTag;
  password: string;
}

interface AppState {
  account: Account | null;
  isAuthenticated: boolean;
  businessTag: BusinessTag;
  login: (account: Account) => void;
  logout: () => void;
  setBusinessTag: (tag: BusinessTag) => void;
  // Legacy compat
  password: string | null;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      account: null,
      password: null,
      isAuthenticated: false,
      businessTag: 'general',
      login: (account) => set({
        account,
        password: account.password,
        isAuthenticated: true,
        businessTag: account.businessTag,
      }),
      logout: () => set({
        account: null,
        password: null,
        isAuthenticated: false,
        businessTag: 'general',
      }),
      setBusinessTag: (tag) => set({ businessTag: tag }),
    }),
    {
      name: 'ai-hub-storage',
    }
  )
);
