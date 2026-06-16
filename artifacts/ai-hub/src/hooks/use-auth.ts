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
        success: boolean; token: string; workspace: string;
        displayName: string; businessTag: string; color: string; emoji: string;
      };
    },
    onSuccess: (data, { password }) => {
      const account: Account = {
        workspace: data.workspace, displayName: data.displayName,
        businessTag: data.businessTag as any, password,
        token: data.token, color: data.color, emoji: data.emoji,
      };
      login(account);
    },
  });
}

export interface EmailLoginResult {
  preToken: string;
  user: { id: number; email: string; name: string };
  workspaces: Workspace[];
}

export function useEmailLogin() {
  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }): Promise<EmailLoginResult> => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      if (data.type !== 'email' && data.type !== 'signup') {
        throw new Error('Unexpected response from server');
      }
      return data;
    },
  });
}

export function useWorkspaceSelect() {
  const login = useAppStore((s) => s.login);
  return useMutation({
    mutationFn: async ({
      preToken, workspaceSlug,
      user,
    }: {
      preToken: string; workspaceSlug: string;
      user: { id: number; email: string; name: string };
    }) => {
      const res = await fetch('/api/auth/workspace-select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preToken, workspaceSlug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Workspace selection failed');
      return { ...data, user };
    },
    onSuccess: (data) => {
      const account: Account = {
        workspace: data.workspace,
        displayName: data.displayName,
        businessTag: data.businessTag as any,
        password: '',
        token: data.token,
        color: data.color,
        emoji: data.emoji,
        userId: data.user?.id,
        email: data.user?.email,
        userName: data.user?.name,
      };
      login(account);
    },
  });
}

export interface SignupResult extends EmailLoginResult {
  type: 'signup';
}

export function useSignup() {
  return useMutation({
    mutationFn: async ({
      email, name, password,
    }: { email: string; name: string; password: string }): Promise<SignupResult> => {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Signup failed');
      return data;
    },
  });
}

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
        workspace: 'general', displayName: 'General',
        businessTag: 'general', password,
        token: data.token ?? '',
        color: '#6366f1', emoji: '⚡',
      });
    },
  });
}
