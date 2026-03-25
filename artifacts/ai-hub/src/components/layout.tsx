import React from 'react';
import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store';
import {
  Bot, Brain, Zap, Link as LinkIcon, LogOut,
  LayoutDashboard, GitFork, Hash, Briefcase, Building2, ChevronDown
} from 'lucide-react';
import { cn } from './ui-elements';
import { useState } from 'react';

const navItems = [
  { path: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { path: '/agents', label: 'Agents', icon: Bot },
  { path: '/brain', label: 'Brain', icon: Brain },
  { path: '/automations', label: 'Automations', icon: Zap },
  { path: '/pipelines', label: 'Pipelines', icon: GitFork },
  { path: '/connections', label: 'Integrations', icon: LinkIcon },
];

const businessTags = [
  { id: 'general', label: 'General', icon: Hash, color: '#6366f1' },
  { id: 'equifind', label: 'Equifind Recovery', icon: Briefcase, color: '#f59e0b' },
  { id: 'home_inspection', label: 'Home Inspections', icon: Building2, color: '#10b981' },
] as const;

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout, businessTag, setBusinessTag } = useAppStore();
  const [workspaceOpen, setWorkspaceOpen] = useState(false);

  const activeTag = businessTags.find(t => t.id === businessTag) || businessTags[0];

  return (
    <div className="flex h-screen bg-[#0c0e16] overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className="w-[68px] flex-shrink-0 bg-[#090b12] border-r border-white/5 flex flex-col items-center py-4 gap-2 z-20">

        {/* Workspace button */}
        <div className="relative mb-2">
          <button
            onClick={() => setWorkspaceOpen(o => !o)}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-lg"
            style={{ background: `linear-gradient(135deg, ${activeTag.color}, ${activeTag.color}88)` }}
            title={activeTag.label}
          >
            {activeTag.id === 'general' ? 'AH' : activeTag.id === 'equifind' ? 'EQ' : 'HI'}
          </button>

          {workspaceOpen && (
            <div className="absolute left-14 top-0 bg-[#131622] border border-white/10 rounded-2xl shadow-2xl p-2 w-52 z-50">
              <p className="text-xs text-white/40 px-3 py-1.5 font-medium uppercase tracking-wider">Workspace</p>
              {businessTags.map(tag => {
                const Icon = tag.icon;
                return (
                  <button
                    key={tag.id}
                    onClick={() => { setBusinessTag(tag.id); setWorkspaceOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
                      businessTag === tag.id ? "bg-white/10 text-white" : "text-white/50 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${tag.color}25`, color: tag.color }}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    {tag.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-8 h-px bg-white/5 mb-1" />

        {/* Nav items */}
        <nav className="flex flex-col items-center gap-1 flex-1">
          {navItems.map((item) => {
            const isActive = location.startsWith(item.path);
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
                  {/* Tooltip */}
                  <div className="absolute left-14 bg-[#1e2230] text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-xl border border-white/10 z-50">
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
          <div className="absolute left-14 bg-[#1e2230] text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-xl border border-white/10 z-50">
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
