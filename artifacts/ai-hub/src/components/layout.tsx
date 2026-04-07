import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAppStore } from '@/store';
import {
  Bot, Brain, Zap, Link as LinkIcon, LogOut, Menu, X,
  LayoutDashboard, GitFork, LayoutGrid, CheckSquare, Users, Sparkles, Share2, Megaphone,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './ui-elements';

const navItems = [
  { path: '/dashboard', label: 'Home',        icon: LayoutDashboard },
  { path: '/agents',    label: 'AI Team',     icon: Bot             },
  { path: '/brain',     label: 'Brain',       icon: Brain           },
  { path: '/power-ups', label: 'Power-Ups',   icon: Sparkles        },
  { path: '/social',    label: 'Social Media',icon: Share2          },
  { path: '/ads',       label: 'Ad Creator',  icon: Megaphone       },
  { path: '/tasks',     label: 'Tasks',       icon: CheckSquare     },
  { path: '/contacts',  label: 'Contacts',    icon: Users           },
  { path: '/automations',label:'Automations', icon: Zap             },
  { path: '/pipelines', label: 'Pipelines',   icon: GitFork         },
  { path: '/connections',label:'Integrations',icon: LinkIcon        },
  { path: '/workspaces',label: 'Workspaces',  icon: LayoutGrid      },
];

// Primary 5 items shown in the mobile bottom bar
const PRIMARY_NAV = ['/dashboard', '/agents', '/ads', '/social', '/brain'];

function initials(name: string) {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout, account } = useAppStore();
  const [moreOpen, setMoreOpen] = useState(false);

  const wsName     = account?.displayName ?? 'AI Hub';
  const wsColor    = account?.color       ?? '#6366f1';
  const wsInitials = account ? initials(account.displayName) : 'AH';

  const primaryItems  = navItems.filter(n => PRIMARY_NAV.includes(n.path));
  const secondaryItems= navItems.filter(n => !PRIMARY_NAV.includes(n.path));

  const isActive = (path: string) =>
    location === path || location.startsWith(path + '/');

  return (
    <div className="flex h-screen bg-[#0c0e16] overflow-hidden">

      {/* ────────────────────────────────────────────────────
          DESKTOP: left icon sidebar (hidden on mobile)
      ──────────────────────────────────────────────────── */}
      <aside className="hidden md:flex w-[68px] flex-shrink-0 bg-[#090b12] border-r border-white/5 flex-col items-center py-4 gap-1 z-20">

        {/* Workspace badge */}
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

        <div className="w-8 h-px bg-white/5 mb-1" />

        <nav className="flex flex-col items-center gap-0.5 flex-1 overflow-y-auto w-full items-center">
          {navItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <div
                title={item.label}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 relative group cursor-pointer",
                  isActive(item.path) ? "bg-primary/20 text-primary" : "text-white/30 hover:bg-white/5 hover:text-white/70"
                )}
              >
                <item.icon className="w-[18px] h-[18px]" />
                {isActive(item.path) && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-primary -ml-px" />
                )}
                <div className="absolute left-14 top-1/2 -translate-y-1/2 bg-[#1e2230] text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-xl border border-white/10 z-50">
                  {item.label}
                </div>
              </div>
            </Link>
          ))}
        </nav>

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

      {/* ────────────────────────────────────────────────────
          MOBILE: top header bar
      ──────────────────────────────────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 bg-[#090b12]/95 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${wsColor}, ${wsColor}88)` }}
          >
            {wsInitials}
          </div>
          <span className="text-sm font-semibold text-white truncate max-w-[160px]">{wsName}</span>
        </div>
        <button
          onClick={() => setMoreOpen(true)}
          className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-white/50 hover:text-white"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* ────────────────────────────────────────────────────
          MOBILE: slide-up "More" drawer
      ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#131622] border-t border-white/10 rounded-t-3xl pb-8"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-4">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>

              <div className="px-5 mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">All sections</p>
                <button onClick={() => setMoreOpen(false)} className="text-white/30 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-4 grid grid-cols-3 gap-2 mb-4">
                {secondaryItems.map(item => (
                  <Link key={item.path} href={item.path}>
                    <div
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all cursor-pointer",
                        isActive(item.path) ? 'bg-primary/15 text-primary' : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/8'
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="text-[10px] font-medium text-center leading-tight">{item.label}</span>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="px-5 pt-3 border-t border-white/5">
                <button
                  onClick={() => { logout(); setMoreOpen(false); }}
                  className="w-full flex items-center gap-3 py-3 text-red-400 text-sm font-medium"
                >
                  <LogOut className="w-4 h-4" /> Log out of {wsName}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ────────────────────────────────────────────────────
          MAIN content area
      ──────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 relative overflow-hidden pt-[53px] md:pt-0 pb-[64px] md:pb-0">
        {children}
      </main>

      {/* ────────────────────────────────────────────────────
          MOBILE: bottom tab bar (primary 5 items)
      ──────────────────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#090b12]/95 backdrop-blur-md border-t border-white/5 flex items-center px-2" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {primaryItems.map(item => (
          <Link key={item.path} href={item.path} className="flex-1">
            <div className={cn(
              "flex flex-col items-center gap-1 py-2.5 transition-all",
              isActive(item.path) ? 'text-primary' : 'text-white/30'
            )}>
              <item.icon className="w-5 h-5" />
              <span className="text-[9px] font-medium leading-none">{item.label.split(' ')[0]}</span>
            </div>
          </Link>
        ))}
        {/* More button */}
        <button
          onClick={() => setMoreOpen(true)}
          className="flex-1 flex flex-col items-center gap-1 py-2.5 text-white/30 hover:text-white transition-all"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[9px] font-medium leading-none">More</span>
        </button>
      </nav>
    </div>
  );
}
