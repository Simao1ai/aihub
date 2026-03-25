import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Lock, ArrowRight } from 'lucide-react';
import { Input, Button } from '@/components/ui-elements';
import { useVerifyPassword } from '@/hooks/use-auth';

const AGENT_EMOJIS = ['🧭', '📬', '✍️', '🔍', '⚙️', '💬'];
const AGENT_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444'];

export default function Login() {
  const [password, setPassword] = useState('');
  const [, setLocation] = useLocation();
  const verifyMutation = useVerifyPassword();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyMutation.mutate(password, {
      onSuccess: () => setLocation('/dashboard'),
    });
  };

  return (
    <div className="min-h-screen flex bg-[#0c0e16] overflow-hidden">

      {/* Left panel — branding */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 bg-[#090b12] border-r border-white/5 relative overflow-hidden">

        {/* Floating agent bubbles */}
        {AGENT_EMOJIS.map((emoji, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 0.6, y: 0 }}
            transition={{ delay: i * 0.12, duration: 0.6 }}
            className="absolute flex items-center justify-center rounded-2xl text-3xl shadow-2xl"
            style={{
              width: 64,
              height: 64,
              background: `${AGENT_COLORS[i]}18`,
              border: `1px solid ${AGENT_COLORS[i]}25`,
              left: `${[12, 55, 25, 68, 10, 60][i]}%`,
              top: `${[15, 22, 45, 50, 72, 78][i]}%`,
              boxShadow: `0 0 40px ${AGENT_COLORS[i]}15`,
            }}
          >
            {emoji}
          </motion.div>
        ))}

        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-lg font-bold text-white">
              A
            </div>
            <span className="font-display font-bold text-white text-lg">AI Hub</span>
          </div>
        </div>

        <div className="relative z-10">
          <h2 className="text-4xl font-display font-bold text-white leading-snug mb-4">
            Your personal<br />AI team, always<br />working for you.
          </h2>
          <p className="text-white/35 text-sm leading-relaxed max-w-xs">
            6 specialized agents for Equifind Recovery and your Home Inspection business — available 24/7.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          {AGENT_EMOJIS.slice(0, 4).map((e, i) => (
            <div key={i} className="w-9 h-9 rounded-full flex items-center justify-center text-base border border-white/10 bg-white/5">
              {e}
            </div>
          ))}
          <span className="text-white/30 text-sm">+2 more agents</span>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-lg font-bold text-white">A</div>
            <span className="font-display font-bold text-white text-lg">AI Hub</span>
          </div>

          <h1 className="text-2xl font-display font-bold text-white mb-2">Welcome back</h1>
          <p className="text-white/35 text-sm mb-8">Enter your access key to continue</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Access key"
                autoFocus
                className="w-full bg-white/5 border border-white/8 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-primary/40 focus:bg-white/7 transition-all"
              />
            </div>

            {verifyMutation.isError && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-400 text-xs pl-1"
              >
                Incorrect access key. Please try again.
              </motion.p>
            )}

            <button
              type="submit"
              disabled={verifyMutation.isPending || !password}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
            >
              {verifyMutation.isPending ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Continue <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <p className="text-white/20 text-xs text-center mt-8">
            Default key: <span className="font-mono text-white/35">aihub2024</span>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
