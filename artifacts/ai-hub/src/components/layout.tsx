import React from 'react';
import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store';
import { Bot, Brain, Zap, Link as LinkIcon, LogOut, Command, Building2, Briefcase, Hash } from 'lucide-react';
import { cn } from './ui-elements';

const navItems = [
  { path: '/agents', label: 'Agents', icon: Bot },
  { path: '/brain', label: 'Brain', icon: Brain },
  { path: '/automations', label: 'Automations', icon: Zap },
  { path: '/connections', label: 'Connections', icon: LinkIcon },
];

const businessTags = [
  { id: 'general', label: 'General', icon: Hash },
  { id: 'equifind', label: 'Equifind', icon: Briefcase },
  { id: 'home_inspection', label: 'Inspections', icon: Building2 },
] as const;

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout, businessTag, setBusinessTag } = useAppStore();

  return (
    <div className="flex h-screen bg-background overflow-hidden selection:bg-primary/30">
      {/* Sidebar */}
      <aside className="w-20 lg:w-64 flex-shrink-0 border-r border-border bg-sidebar flex flex-col justify-between transition-all duration-300 z-20 relative shadow-[4px_0_24px_rgba(0,0,0,0.2)]">
        <div>
          <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-border/50">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
              <Command className="w-5 h-5 text-white" />
            </div>
            <span className="ml-3 font-display font-bold text-lg hidden lg:block text-white">AI Hub</span>
          </div>
          
          <nav className="p-3 space-y-2 mt-4">
            {navItems.map((item) => {
              const isActive = location.startsWith(item.path) || (location === '/' && item.path === '/agents');
              return (
                <Link key={item.path} href={item.path} className="block relative">
                  <div className={cn(
                    "flex items-center px-3 py-3 rounded-xl transition-all duration-200 group",
                    isActive 
                      ? "text-white bg-white/5 shadow-inner" 
                      : "text-muted-foreground hover:text-white hover:bg-white/5"
                  )}>
                    {isActive && (
                      <motion.div 
                        layoutId="active-nav" 
                        className="absolute left-0 w-1 h-8 bg-primary rounded-r-full" 
                        initial={false}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-primary drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" : "")} />
                    <span className="ml-3 font-medium hidden lg:block">{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-border/50">
          <button 
            onClick={logout}
            className="flex items-center w-full px-3 py-2.5 rounded-xl text-muted-foreground hover:text-white hover:bg-red-500/10 hover:text-red-400 transition-all group"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span className="ml-3 font-medium hidden lg:block">Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0a0b10] relative">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/4 w-1/2 h-64 bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-border/50 bg-background/50 backdrop-blur-md z-10 shrink-0">
          <div className="flex items-center">
            <h1 className="text-lg font-display font-semibold text-white tracking-wide">
              {navItems.find(i => location.startsWith(i.path))?.label || 'Command Center'}
            </h1>
          </div>
          
          {/* Business Context Segmented Control */}
          <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 shadow-inner">
            {businessTags.map(tag => {
              const isActive = businessTag === tag.id;
              return (
                <button
                  key={tag.id}
                  onClick={() => setBusinessTag(tag.id)}
                  className={cn(
                    "flex items-center px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 relative",
                    isActive ? "text-white" : "text-white/40 hover:text-white/80"
                  )}
                >
                  {isActive && (
                    <motion.div 
                      layoutId="active-tag" 
                      className="absolute inset-0 bg-secondary border border-border shadow-sm rounded-lg"
                      initial={false}
                      transition={{ type: "spring", stiffness: 400, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <tag.icon className="w-3.5 h-3.5" />
                    {tag.label}
                  </span>
                </button>
              );
            })}
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-hidden relative z-0">
          {children}
        </div>
      </main>
    </div>
  );
}
