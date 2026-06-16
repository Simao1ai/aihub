import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAppStore } from '@/store';
import type { HubNotification } from '@/store';
import {
  Bot, Brain, Zap, Link as LinkIcon, LogOut, Menu, X,
  LayoutDashboard, GitFork, LayoutGrid, CheckSquare, Users, Sparkles, Share2, Megaphone,
  Bell, ArrowRight, Trash2,
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

const PRIMARY_NAV = ['/dashboard', '/agents', '/ads', '/social', '/brain'];

function initials(name: string) {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Notification Panel ────────────────────────────────────────────────────────
function NotificationPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { notifications, markAllRead, dismissNotification, clearAllNotifications } = useAppStore();
  const unread = notifications.filter(n => !n.read).length;

  const handleAction = (n: HubNotification) => {
    dismissNotification(n.id);
    if (n.action?.href) window.location.href = n.action.href;
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed z-50 bg-white border border-gray-200 shadow-xl flex flex-col
              left-[76px] top-4 bottom-4 w-[320px] rounded-2xl
              md:left-[76px] md:top-4 md:bottom-4 md:w-[320px] md:rounded-2xl
              max-md:left-4 max-md:right-4 max-md:bottom-4 max-md:top-auto max-md:h-[75vh] max-md:rounded-t-3xl"
          >
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-semibold text-gray-900">Notifications</span>
                {unread > 0 && (
                  <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                    {unread} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unread > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[10px] text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-50 transition-all"
                  >
                    Mark all read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={clearAllNotifications}
                    title="Clear all"
                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
                  <Bell className="w-8 h-8 text-gray-200" />
                  <p className="text-xs text-gray-400">No notifications yet</p>
                  <p className="text-[10px] text-gray-300 text-center px-6 leading-relaxed">
                    Agent handoffs and post saves will appear here
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={cn(
                        "flex gap-3 px-4 py-3.5 transition-colors",
                        !n.read ? "bg-primary/4" : "hover:bg-gray-50"
                      )}
                    >
                      <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-lg shrink-0 mt-0.5">
                        {n.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            "text-xs font-semibold leading-snug",
                            !n.read ? "text-gray-900" : "text-gray-600"
                          )}>
                            {n.title}
                          </p>
                          <button
                            onClick={() => dismissNotification(n.id)}
                            className="text-gray-300 hover:text-gray-500 shrink-0 mt-0.5 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{n.body}</p>
                        <div className="flex items-center gap-2 mt-2">
                          {n.action && (
                            <button
                              onClick={() => handleAction(n)}
                              className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors"
                            >
                              {n.action.label}
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                          <span className="text-[10px] text-gray-300 ml-auto">{timeAgo(n.createdAt)}</span>
                        </div>
                      </div>
                      {!n.read && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Bell Button ───────────────────────────────────────────────────────────────
function BellButton({ onClick, className }: { onClick: () => void; className?: string }) {
  const unread = useAppStore(s => s.notifications.filter(n => !n.read).length);
  return (
    <button
      onClick={onClick}
      title="Notifications"
      className={cn(
        "relative w-10 h-10 rounded-xl flex items-center justify-center transition-all",
        "text-gray-400 hover:bg-gray-100 hover:text-gray-600",
        className
      )}
    >
      <Bell className="w-[18px] h-[18px]" />
      {unread > 0 && (
        <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary text-[9px] font-bold text-white flex items-center justify-center leading-none">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  );
}

// ── App Layout ────────────────────────────────────────────────────────────────
export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout, account } = useAppStore();
  const [moreOpen, setMoreOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const wsName     = account?.displayName ?? 'AI Hub';
  const wsColor    = account?.color       ?? '#6366f1';
  const wsInitials = account ? initials(account.displayName) : 'SD';

  const primaryItems  = navItems.filter(n => PRIMARY_NAV.includes(n.path));
  const secondaryItems= navItems.filter(n => !PRIMARY_NAV.includes(n.path));

  const isActive = (path: string) =>
    location === path || location.startsWith(path + '/');

  const toggleNotif = () => {
    setNotifOpen(o => !o);
    setMoreOpen(false);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ── DESKTOP: left icon sidebar ── */}
      <aside className="hidden md:flex w-[68px] flex-shrink-0 bg-white border-r border-gray-100 flex-col items-center py-4 gap-1 z-20">

        {/* Workspace badge */}
        <div className="relative group mb-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-sm cursor-default select-none"
            style={{ background: `linear-gradient(135deg, ${wsColor}, ${wsColor}88)` }}
          >
            {wsInitials}
          </div>
          <div className="absolute left-14 top-1/2 -translate-y-1/2 bg-white text-gray-900 text-xs font-medium px-3 py-2 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg border border-gray-200 z-50">
            <p className="font-semibold">{wsName}</p>
            <p className="text-gray-400 text-[10px] mt-0.5">Active workspace</p>
          </div>
        </div>

        <div className="w-8 h-px bg-gray-100 mb-1" />

        <nav className="flex flex-col items-center gap-0.5 flex-1 overflow-y-auto w-full items-center">
          {navItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <div
                title={item.label}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 relative group cursor-pointer",
                  isActive(item.path)
                    ? "bg-primary/10 text-primary"
                    : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                )}
              >
                <item.icon className="w-[18px] h-[18px]" />
                {isActive(item.path) && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-primary -ml-px" />
                )}
                <div className="absolute left-14 top-1/2 -translate-y-1/2 bg-white text-gray-900 text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg border border-gray-200 z-50">
                  {item.label}
                </div>
              </div>
            </Link>
          ))}
        </nav>

        <div className="relative group">
          <BellButton onClick={toggleNotif} />
          <div className="absolute left-14 top-1/2 -translate-y-1/2 bg-white text-gray-900 text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg border border-gray-200 z-50">
            Notifications
          </div>
        </div>

        <button
          onClick={logout}
          title="Log out"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-300 hover:bg-red-50 hover:text-red-500 transition-all group relative"
        >
          <LogOut className="w-[18px] h-[18px]" />
          <div className="absolute left-14 top-1/2 -translate-y-1/2 bg-white text-gray-900 text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg border border-gray-200 z-50">
            Log out
          </div>
        </button>
      </aside>

      {/* ── MOBILE: top header bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${wsColor}, ${wsColor}88)` }}
          >
            {wsInitials}
          </div>
          <span className="text-sm font-semibold text-gray-900 truncate max-w-[140px]">{wsName}</span>
        </div>
        <div className="flex items-center gap-1">
          <BellButton onClick={toggleNotif} className="w-9 h-9" />
          <button
            onClick={() => setMoreOpen(true)}
            className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── MOBILE: slide-up "More" drawer ── */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 rounded-t-3xl pb-8"
            >
              <div className="flex justify-center pt-3 pb-4">
                <div className="w-10 h-1 rounded-full bg-gray-200" />
              </div>
              <div className="px-5 mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">All sections</p>
                <button onClick={() => setMoreOpen(false)} className="text-gray-400 hover:text-gray-600">
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
                        isActive(item.path)
                          ? 'bg-primary/10 text-primary'
                          : 'bg-gray-50 text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="text-[10px] font-medium text-center leading-tight">{item.label}</span>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="px-5 pt-3 border-t border-gray-100">
                <button
                  onClick={() => { logout(); setMoreOpen(false); }}
                  className="w-full flex items-center gap-3 py-3 text-red-500 text-sm font-medium"
                >
                  <LogOut className="w-4 h-4" /> Log out of {wsName}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />

      {/* ── MAIN content area ── */}
      <main className="flex-1 flex flex-col min-w-0 relative overflow-hidden pt-[53px] md:pt-0 pb-[64px] md:pb-0">
        {children}
      </main>

      {/* ── MOBILE: bottom tab bar ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-gray-100 flex items-center px-2" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {primaryItems.map(item => (
          <Link key={item.path} href={item.path} className="flex-1">
            <div className={cn(
              "flex flex-col items-center gap-1 py-2.5 transition-all",
              isActive(item.path) ? 'text-primary' : 'text-gray-400'
            )}>
              <item.icon className="w-5 h-5" />
              <span className="text-[9px] font-medium leading-none">{item.label.split(' ')[0]}</span>
            </div>
          </Link>
        ))}
        <button
          onClick={() => setMoreOpen(true)}
          className="flex-1 flex flex-col items-center gap-1 py-2.5 text-gray-400 hover:text-gray-600 transition-all"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[9px] font-medium leading-none">More</span>
        </button>
      </nav>
    </div>
  );
}
