import { useMutation, useQuery } from '@tanstack/react-query';
import { useAppStore, type Account } from '@/store';

export interface Workspace {
  id: number;
  slug: string;
  name: string;
  description?: string;
  emoji: string;
  color: string;
}

async function fetchWorkspaces(): Promise<Workspace[]> {
  const res = await fetch('/api/auth/workspaces');
  if (!res.ok) throw new Error('Failed to load workspaces');
  return res.json();
}

export function useWorkspaces() {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: fetchWorkspaces,
    staleTime: 0,
  });
}

export function useLogin() {
  const login = useAppStore((s) => s.login);

  return useMutation({
    mutationFn: async ({ workspace, password }: { workspace: string; password: string }) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      return data as {
        success: boolean;
        token: string;
        workspace: string;
        displayName: string;
        businessTag: string;
        color: string;
        emoji: string;
      };
    },
    onSuccess: (data, { password }) => {
      const account: Account = {
        workspace: data.workspace,
        displayName: data.displayName,
        businessTag: data.businessTag as any,
        password,
        token: data.token,
        color: data.color,
        emoji: data.emoji,
      };
      login(account);
    },
  });
}

// Legacy hook — kept so anything that imports it doesn't break
export function useVerifyPassword() {
  const login = useAppStore((s) => s.login);

  return useMutation({
    mutationFn: async (password: string) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace: 'general', password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid password');
      return data;
    },
    onSuccess: (data, password) => {
      login({
        workspace: 'general',
        displayName: 'General',
        businessTag: 'general',
        password,
        color: '#6366f1',
        emoji: '⚡',
      });
    },
  });
}
