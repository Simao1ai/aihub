import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ArrowRight, ChevronLeft } from 'lucide-react';
import { useWorkspaces, useLogin, type Workspace } from '@/hooks/use-auth';

const DEFAULT_WORKSPACES: Workspace[] = [
  { id: 1, slug: 'general', name: 'General', description: 'Full access across all businesses and agents', emoji: '⚡', color: '#6366f1' },
  { id: 2, slug: 'equifind', name: 'Equifind Recovery', description: 'Florida tax deed surplus fund recovery operations', emoji: '💼', color: '#f59e0b' },
  { id: 3, slug: 'home_inspection', name: 'Home Inspections', description: 'B2B home inspection & realtor network management', emoji: '🏠', color: '#10b981' },
];

export default function Login() {
  const [, setLocation] = useLocation();

  // If ?ws=slug is in the URL, skip the picker and go straight to password
  const urlWs = new URLSearchParams(window.location.search).get('ws') ?? '';
  const [step, setStep] = useState<'pick' | 'password'>(urlWs ? 'password' : 'pick');
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [password, setPassword] = useState('');

  const { data: workspaces = DEFAULT_WORKSPACES } = useWorkspaces();
  const loginMutation = useLogin();

  // Auto-resolve the workspace from the ?ws= URL param once the list is loaded
  useEffect(() => {
    if (!urlWs || !workspaces.length) return;
    const match = workspaces.find(w => w.slug === urlWs || w.slug.replace(/-/g, '_') === urlWs.replace(/-/g, '_'));
    if (match) {
      setSelectedWorkspace(match);
      setStep('password');
    }
  }, [urlWs, workspaces]);

  const handleSelectWorkspace = (ws: Workspace) => {
    setSelectedWorkspace(ws);
    setPassword('');
    loginMutation.reset();
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
      { workspace: selectedWorkspace.slug, password },
      { onSuccess: () => setLocation('/dashboard') }
    );
  };

  return (
    <div className="min-h-screen flex bg-[#0c0e16] overflow-hidden">

      {/* Left panel */}
      <div className="hidden lg:flex w-[45%] flex-col justify-between p-12 bg-[#090b12] border-r border-white/5 relative overflow-hidden">
        {/* Floating workspace preview cards */}
        {workspaces.slice(0, 3).map((ws, i) => (
          <motion.div
            key={ws.slug}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 0.75, y: 0 }}
            transition={{ delay: i * 0.15, duration: 0.6 }}
            className="absolute rounded-2xl border flex flex-col gap-2 p-4"
            style={{
              background: `${ws.color}0c`,
              borderColor: `${ws.color}20`,
              width: 160,
              left: `${[8, 48, 28][i]}%`,
              top: `${[12, 30, 58][i]}%`,
              boxShadow: `0 0 40px ${ws.color}10`,
            }}
          >
            <span className="text-3xl">{ws.emoji}</span>
            <p className="text-xs font-semibold text-white/60">{ws.name}</p>
            {ws.description && (
              <p className="text-[10px] text-white/30 leading-relaxed line-clamp-2">{ws.description}</p>
            )}
          </motion.div>
        ))}

        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center font-bold text-white text-lg">A</div>
          <span className="font-display font-bold text-white text-lg">AI Hub</span>
        </div>

        {/* Tagline */}
        <div className="relative z-10">
          <h2 className="text-4xl font-display font-bold text-white leading-snug mb-3">
            One hub,<br />every business.
          </h2>
          <p className="text-white/35 text-sm leading-relaxed max-w-xs">
            Log in to a dedicated workspace — each business gets its own agents, brain, automations, and pipelines.
          </p>
        </div>

        {/* Workspace count */}
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
                transition={{ duration: 0.22 }}
              >
                <h1 className="text-2xl font-display font-bold text-white mb-1">Choose your workspace</h1>
                <p className="text-white/35 text-sm mb-8">Select the business you'd like to access</p>

                <div className="space-y-2.5">
                  {workspaces.map((ws) => (
                    <motion.button
                      key={ws.slug}
                      onClick={() => handleSelectWorkspace(ws)}
                      whileHover={{ scale: 1.015 }}
                      whileTap={{ scale: 0.99 }}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl border border-white/8 bg-white/3 hover:bg-white/6 hover:border-white/15 transition-all text-left group"
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                        style={{ background: `${ws.color}18`, boxShadow: `0 0 20px ${ws.color}15` }}
                      >
                        {ws.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm">{ws.name}</p>
                        {ws.description && (
                          <p className="text-white/35 text-xs mt-0.5 line-clamp-1">{ws.description}</p>
                        )}
                      </div>
                      <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors shrink-0" />
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 2 — Enter password */}
            {step === 'password' && selectedWorkspace && (
              <motion.div
                key="password"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.22 }}
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
                    style={{ background: `${selectedWorkspace.color}18`, boxShadow: `0 0 30px ${selectedWorkspace.color}20` }}
                  >
                    {selectedWorkspace.emoji}
                  </div>
                  <div>
                    <p className="text-xs text-white/30 font-medium uppercase tracking-wider mb-0.5">Signing in to</p>
                    <h1 className="text-xl font-display font-bold text-white">{selectedWorkspace.name}</h1>
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
                    />
                  </div>

                  {loginMutation.isError && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-xs pl-1">
                      Incorrect password. Please try again.
                    </motion.p>
                  )}

                  <button
                    type="submit"
                    disabled={loginMutation.isPending || !password}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: selectedWorkspace.color,
                      boxShadow: `0 4px 20px ${selectedWorkspace.color}35`,
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
