import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ArrowRight, ChevronLeft, Check } from 'lucide-react';
import { useWorkspaces, useLogin, type Workspace } from '@/hooks/use-auth';

const WORKSPACE_CONFIG: Record<string, { emoji: string; color: string; description: string; bg: string }> = {
  general: {
    emoji: '⚡',
    color: '#6366f1',
    bg: 'from-[#6366f1]/20 to-[#6366f1]/5',
    description: 'Full access across all businesses and agents',
  },
  equifind: {
    emoji: '💼',
    color: '#f59e0b',
    bg: 'from-[#f59e0b]/20 to-[#f59e0b]/5',
    description: 'Florida tax deed surplus fund recovery operations',
  },
  home_inspection: {
    emoji: '🏠',
    color: '#10b981',
    bg: 'from-[#10b981]/20 to-[#10b981]/5',
    description: 'B2B home inspection & realtor network management',
  },
};

// Fallback default workspaces if API isn't ready yet
const DEFAULT_WORKSPACES: Workspace[] = [
  { id: 'general', displayName: 'General', businessTag: 'general' },
  { id: 'equifind', displayName: 'Equifind Recovery', businessTag: 'equifind' },
  { id: 'home_inspection', displayName: 'Home Inspections', businessTag: 'home_inspection' },
];

export default function Login() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<'pick' | 'password'>('pick');
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [password, setPassword] = useState('');

  const { data: workspaces = DEFAULT_WORKSPACES } = useWorkspaces();
  const loginMutation = useLogin();

  const handleSelectWorkspace = (ws: Workspace) => {
    setSelectedWorkspace(ws);
    setPassword('');
    setStep('password');
  };

  const handleBack = () => {
    setStep('pick');
    setSelectedWorkspace(null);
    loginMutation.reset();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkspace || !password) return;
    loginMutation.mutate(
      { workspace: selectedWorkspace.id, password },
      { onSuccess: () => setLocation('/dashboard') }
    );
  };

  const cfg = selectedWorkspace ? (WORKSPACE_CONFIG[selectedWorkspace.id] ?? WORKSPACE_CONFIG.general) : null;

  return (
    <div className="min-h-screen flex bg-[#0c0e16] overflow-hidden">

      {/* Left panel */}
      <div className="hidden lg:flex w-[45%] flex-col justify-between p-12 bg-[#090b12] border-r border-white/5 relative overflow-hidden">
        {/* Floating workspace bubbles */}
        {Object.entries(WORKSPACE_CONFIG).map(([id, config], i) => {
          const ws = workspaces.find(w => w.id === id);
          return (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 0.7, y: 0 }}
              transition={{ delay: i * 0.15, duration: 0.6 }}
              className="absolute rounded-2xl border flex flex-col gap-2 p-4"
              style={{
                background: `${config.color}0c`,
                borderColor: `${config.color}20`,
                width: 160,
                left: `${[8, 48, 28][i]}%`,
                top: `${[12, 30, 58][i]}%`,
                boxShadow: `0 0 40px ${config.color}10`,
              }}
            >
              <span className="text-3xl">{config.emoji}</span>
              <p className="text-xs font-semibold text-white/60">{ws?.displayName ?? id}</p>
              <p className="text-[10px] text-white/30 leading-relaxed">{config.description}</p>
            </motion.div>
          );
        })}

        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center font-bold text-white text-lg">A</div>
          <span className="font-display font-bold text-white text-lg">AI Hub</span>
        </div>

        <div className="relative z-10">
          <h2 className="text-4xl font-display font-bold text-white leading-snug mb-3">
            One hub,<br />every business.
          </h2>
          <p className="text-white/35 text-sm leading-relaxed max-w-xs">
            Log in to a dedicated workspace — each business gets its own agents, brain, automations, and pipelines.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-xs text-white/20">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          {workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''} available
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center font-bold text-white text-lg">A</div>
            <span className="font-display font-bold text-white text-lg">AI Hub</span>
          </div>

          <AnimatePresence mode="wait">

            {/* Step 1 — Pick workspace */}
            {step === 'pick' && (
              <motion.div
                key="pick"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25 }}
              >
                <h1 className="text-2xl font-display font-bold text-white mb-1">Choose your workspace</h1>
                <p className="text-white/35 text-sm mb-8">Select the business you'd like to access</p>

                <div className="space-y-3">
                  {workspaces.map((ws) => {
                    const config = WORKSPACE_CONFIG[ws.id] ?? WORKSPACE_CONFIG.general;
                    return (
                      <motion.button
                        key={ws.id}
                        onClick={() => handleSelectWorkspace(ws)}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl border border-white/8 bg-white/3 hover:bg-white/6 hover:border-white/15 transition-all text-left group"
                      >
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                          style={{ background: `${config.color}18`, boxShadow: `0 0 20px ${config.color}15` }}
                        >
                          {config.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white text-sm">{ws.displayName}</p>
                          <p className="text-white/35 text-xs mt-0.5 line-clamp-1">{config.description}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors shrink-0" />
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Step 2 — Enter password */}
            {step === 'password' && selectedWorkspace && cfg && (
              <motion.div
                key="password"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.25 }}
              >
                <button
                  onClick={handleBack}
                  className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/70 transition-colors mb-8"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> All workspaces
                </button>

                {/* Workspace badge */}
                <div className="flex items-center gap-3 mb-8">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
                    style={{ background: `${cfg.color}18`, boxShadow: `0 0 30px ${cfg.color}20` }}
                  >
                    {cfg.emoji}
                  </div>
                  <div>
                    <p className="text-xs text-white/30 font-medium uppercase tracking-wider mb-0.5">Signing in to</p>
                    <h1 className="text-xl font-display font-bold text-white">{selectedWorkspace.displayName}</h1>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Workspace password"
                      autoFocus
                      className="w-full bg-white/5 border border-white/8 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/20 transition-all"
                      style={{ '--tw-ring-color': cfg.color } as React.CSSProperties}
                    />
                  </div>

                  {loginMutation.isError && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-red-400 text-xs pl-1"
                    >
                      Incorrect password. Please try again.
                    </motion.p>
                  )}

                  <button
                    type="submit"
                    disabled={loginMutation.isPending || !password}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: cfg.color,
                      boxShadow: `0 4px 20px ${cfg.color}35`,
                    }}
                  >
                    {loginMutation.isPending ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>Enter workspace <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </form>

                <p className="text-white/15 text-xs text-center mt-6">
                  Default password: <span className="font-mono text-white/25">aihub2024</span>
                </p>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
