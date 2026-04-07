import React from 'react';
import { Link, useLocation } from 'wouter';
import { useAppStore } from '@/store';
import {
  Bot, Brain, Zap, Link as LinkIcon, LogOut,
  LayoutDashboard, GitFork, LayoutGrid, CheckSquare, Users, Sparkles,
} from 'lucide-react';
import { cn } from './ui-elements';

const navItems = [
  { path: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { path: '/agents', label: 'AI Team', icon: Bot },
  { path: '/brain', label: 'Brain', icon: Brain },
  { path: '/power-ups', label: 'Power-Ups', icon: Sparkles },
  { path: '/tasks', label: 'Tasks', icon: CheckSquare },
  { path: '/contacts', label: 'Contacts', icon: Users },
  { path: '/automations', label: 'Automations', icon: Zap },
  { path: '/pipelines', label: 'Pipelines', icon: GitFork },
  { path: '/connections', label: 'Integrations', icon: LinkIcon },
  { path: '/workspaces', label: 'Workspaces', icon: LayoutGrid },
];

function initials(name: string) {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout, account } = useAppStore();

  const wsName = account?.displayName ?? 'AI Hub';
  const wsColor = account?.color ?? '#6366f1';
  const wsInitials = account ? initials(account.displayName) : 'AH';

  return (
    <div className="flex h-screen bg-[#0c0e16] overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className="w-[68px] flex-shrink-0 bg-[#090b12] border-r border-white/5 flex flex-col items-center py-4 gap-1 z-20">

        {/* Workspace indicator */}
        <div className="relative group mb-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-lg cursor-default select-none"
            style={{ background: `linear-gradient(135deg, ${wsColor}, ${wsColor}88)` }}
          >
            {wsInitials}
          </div>
          <div className="absolute left-14 top-1/2 -translate-y-1/2 bg-[#1e2230] text-white text-xs font-medium px-3 py-2 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-xl border border-white/10 z-50">
            <p className="font-semibold">{wsName}</p>
            <p className="text-white/40 text-[10px] mt-0.5">Active workspace</p>
          </div>
        </div>

        {/* Divider */}
        <div className="w-8 h-px bg-white/5 mb-1" />

        {/* Nav items */}
        <nav className="flex flex-col items-center gap-0.5 flex-1">
          {navItems.map((item) => {
            const isActive = location === item.path || location.startsWith(item.path + '/');
            return (
              <Link key={item.path} href={item.path}>
                <div
                  title={item.label}
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 relative group cursor-pointer",
                    isActive
                      ? "bg-primary/20 text-primary"
                      : "text-white/30 hover:bg-white/5 hover:text-white/70"
                  )}
                >
                  <item.icon className="w-[18px] h-[18px]" />
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-primary -ml-px" />
                  )}
                  <div className="absolute left-14 top-1/2 -translate-y-1/2 bg-[#1e2230] text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-xl border border-white/10 z-50">
                    {item.label}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <button
          onClick={logout}
          title="Log out"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white/25 hover:bg-red-500/10 hover:text-red-400 transition-all group relative"
        >
          <LogOut className="w-[18px] h-[18px]" />
          <div className="absolute left-14 top-1/2 -translate-y-1/2 bg-[#1e2230] text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-xl border border-white/10 z-50">
            Log out
          </div>
        </button>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
        {children}
      </main>
    </div>
  );
}
