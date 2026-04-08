import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type BusinessTag = string;

export interface Account {
  workspace: string;
  displayName: string;
  businessTag: BusinessTag;
  password: string;
  color: string;
  emoji: string;
}

export interface HubNotification {
  id: string;
  type: 'agentHandoff' | 'socialPost';
  icon: string;
  title: string;
  body: string;
  action?: { label: string; href: string };
  createdAt: number;
  read: boolean;
}

interface AppState {
  account: Account | null;
  isAuthenticated: boolean;
  businessTag: BusinessTag;
  login: (account: Account) => void;
  logout: () => void;
  setBusinessTag: (tag: BusinessTag) => void;
  password: string | null;

  // ── Notification center ──────────────────────────────────────────────────
  notifications: HubNotification[];
  addNotification: (n: Omit<HubNotification, 'id' | 'createdAt' | 'read'>) => void;
  markAllRead: () => void;
  dismissNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      account: null,
      password: null,
      isAuthenticated: false,
      businessTag: 'general',
      notifications: [],

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

      addNotification: (n) => set((state) => ({
        notifications: [
          {
            ...n,
            id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            createdAt: Date.now(),
            read: false,
          },
          ...state.notifications,
        ].slice(0, 50), // keep last 50
      })),

      markAllRead: () => set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, read: true })),
      })),

      dismissNotification: (id) => set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id),
      })),

      clearAllNotifications: () => set({ notifications: [] }),
    }),
    {
      name: 'ai-hub-storage',
      partialize: (state) => ({
        account: state.account,
        isAuthenticated: state.isAuthenticated,
        businessTag: state.businessTag,
        password: state.password,
        notifications: state.notifications,
      }),
    }
  )
);
