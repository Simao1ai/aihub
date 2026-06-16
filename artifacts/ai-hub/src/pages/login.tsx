import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ArrowRight, ChevronLeft, Mail, User, Eye, EyeOff } from 'lucide-react';
import {
  useWorkspaces, useLogin, useEmailLogin, useWorkspaceSelect, useSignup,
  type Workspace, type EmailLoginResult,
} from '@/hooks/use-auth';
import { BRAND } from '@/lib/brand';

type LoginMode = 'workspace' | 'email';
type EmailStep = 'form' | 'select-workspace';

export default function Login() {
  const [, setLocation] = useLocation();

  const urlWs = new URLSearchParams(window.location.search).get('ws') ?? '';
  const [step, setStep] = useState<'pick' | 'password'>(urlWs ? 'password' : 'pick');
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [password, setPassword] = useState('');
  const [loginMode, setLoginMode] = useState<LoginMode>('workspace');

  const [email, setEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [showEmailPw, setShowEmailPw] = useState(false);
  const [emailStep, setEmailStep] = useState<EmailStep>('form');
  const [emailLoginData, setEmailLoginData] = useState<EmailLoginResult | null>(null);
  const [pendingPreToken, setPendingPreToken] = useState<string | null>(null);
  const [pendingUser, setPendingUser] = useState<{ id: number; email: string; name: string } | null>(null);

  const { data: workspaces = [] } = useWorkspaces();
  const loginMutation = useLogin();
  const emailLoginMutation = useEmailLogin();
  const workspaceSelectMutation = useWorkspaceSelect();
  const signupMutation = useSignup();
  const [isSignupMode, setIsSignupMode] = useState(false);
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [showSignupPw, setShowSignupPw] = useState(false);

  useEffect(() => {
    if (!urlWs || !workspaces.length) return;
    const match = workspaces.find(w => w.slug === urlWs || w.slug.replace(/-/g, '_') === urlWs.replace(/-/g, '_'));
    if (match) { setSelectedWorkspace(match); setStep('password'); }
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

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !emailPassword) return;
    emailLoginMutation.mutate({ email, password: emailPassword }, {
      onSuccess: (data) => {
        if (data.workspaces.length === 1) {
          workspaceSelectMutation.mutate(
            { preToken: data.preToken, workspaceSlug: data.workspaces[0].slug, user: data.user },
            { onSuccess: () => setLocation('/dashboard') }
          );
        } else {
          setEmailLoginData(data);
          setPendingPreToken(data.preToken);
          setPendingUser(data.user);
          setEmailStep('select-workspace');
        }
      },
    });
  };

  const handleEmailWorkspaceSelect = (ws: Workspace) => {
    if (!pendingPreToken || !pendingUser) return;
    workspaceSelectMutation.mutate(
      { preToken: pendingPreToken, workspaceSlug: ws.slug, user: pendingUser },
      { onSuccess: () => setLocation('/dashboard') }
    );
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupEmail || !signupName || !signupPassword) return;
    if (signupPassword !== signupConfirm) return;
    signupMutation.mutate({ email: signupEmail, name: signupName, password: signupPassword }, {
      onSuccess: (data) => {
        if (data.workspaces.length === 1) {
          workspaceSelectMutation.mutate(
            { preToken: data.preToken, workspaceSlug: data.workspaces[0].slug, user: data.user },
            { onSuccess: () => setLocation('/dashboard') }
          );
        }
      },
    });
  };

  const resetEmailFlow = () => {
    setEmailStep('form');
    setEmailLoginData(null);
    setPendingPreToken(null);
    setPendingUser(null);
    emailLoginMutation.reset();
    workspaceSelectMutation.reset();
  };

  return (
    <div className="min-h-screen flex bg-[#f8fafc] overflow-hidden">
      {/* Left panel */}
      <div className="hidden lg:flex w-[45%] flex-col justify-between p-12 bg-white border-r border-gray-100 relative overflow-hidden">
        {workspaces.slice(0, 3).map((ws, i) => (
          <motion.div
            key={ws.slug}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 0.75, y: 0 }}
            transition={{ delay: i * 0.15, duration: 0.6 }}
            className="absolute rounded-2xl border flex flex-col gap-2 p-4"
            style={{
              background: `${ws.color}0c`, borderColor: `${ws.color}20`,
              width: 160, left: `${[8, 48, 28][i]}%`, top: `${[12, 30, 58][i]}%`,
              boxShadow: `0 0 40px ${ws.color}10`,
            }}
          >
            <span className="text-3xl">{ws.emoji}</span>
            <p className="text-xs font-semibold text-gray-500">{ws.name}</p>
            {ws.description && <p className="text-[10px] text-gray-400 leading-relaxed line-clamp-2">{ws.description}</p>}
          </motion.div>
        ))}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center font-bold text-gray-900 text-lg">{BRAND.logoLetter}</div>
          <span className="font-display font-bold text-gray-900 text-lg">{BRAND.name}</span>
        </div>
        <div className="relative z-10">
          <h2 className="text-4xl font-display font-bold text-gray-900 leading-snug mb-3">{BRAND.tagline.replace(',', ',\n')}</h2>
          <p className="text-gray-400 text-sm leading-relaxed max-w-xs">{BRAND.taglineSub}</p>
        </div>
        <div className="relative z-10 flex items-center gap-2 text-xs text-gray-300">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          {workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''} available
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center font-bold text-gray-900 text-lg">{BRAND.logoLetter}</div>
            <span className="font-display font-bold text-gray-900 text-lg">{BRAND.name}</span>
          </div>

          {/* Mode toggle (only on pick step / email form step) */}
          {(step === 'pick' || (loginMode === 'email' && emailStep === 'form')) && !isSignupMode && (
            <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1 mb-8">
              <button
                onClick={() => { setLoginMode('workspace'); resetEmailFlow(); }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${loginMode === 'workspace' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Select Workspace
              </button>
              <button
                onClick={() => { setLoginMode('email'); setStep('pick'); }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${loginMode === 'email' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Sign in with Email
              </button>
            </div>
          )}

          <AnimatePresence mode="wait">

            {/* ─── Signup form ─── */}
            {isSignupMode && (
              <motion.div key="signup" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.22 }}>
                <button onClick={() => { setIsSignupMode(false); signupMutation.reset(); }} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-8">
                  <ChevronLeft className="w-3.5 h-3.5" /> Back to login
                </button>
                <h1 className="text-2xl font-display font-bold text-gray-900 mb-1">Create your account</h1>
                <p className="text-gray-400 text-sm mb-8">Get started with {BRAND.shortName} for free</p>
                <form onSubmit={handleSignup} className="space-y-3">
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input type="text" value={signupName} onChange={e => setSignupName(e.target.value)} placeholder="Full name" required
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-4 py-3.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary/40 transition-all" />
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input type="email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} placeholder="Email address" required
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-4 py-3.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary/40 transition-all" />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input type={showSignupPw ? 'text' : 'password'} value={signupPassword} onChange={e => setSignupPassword(e.target.value)} placeholder="Password (min 8 chars)" required minLength={8}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-11 py-3.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary/40 transition-all" />
                    <button type="button" onClick={() => setShowSignupPw(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showSignupPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input type="password" value={signupConfirm} onChange={e => setSignupConfirm(e.target.value)} placeholder="Confirm password" required
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-4 py-3.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary/40 transition-all" />
                  </div>
                  {signupPassword && signupConfirm && signupPassword !== signupConfirm && (
                    <p className="text-red-400 text-xs pl-1">Passwords don't match</p>
                  )}
                  {signupMutation.isError && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-xs pl-1">
                      {(signupMutation.error as Error).message}
                    </motion.p>
                  )}
                  <button type="submit"
                    disabled={signupMutation.isPending || !signupEmail || !signupName || !signupPassword || signupPassword !== signupConfirm}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-gray-900 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 shadow-lg shadow-primary/20"
                  >
                    {signupMutation.isPending
                      ? <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                      : <>Create account <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </form>
              </motion.div>
            )}

            {/* ─── Email login form ─── */}
            {!isSignupMode && loginMode === 'email' && emailStep === 'form' && (
              <motion.div key="email-form" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.22 }}>
                <h1 className="text-2xl font-display font-bold text-gray-900 mb-1">Welcome back</h1>
                <p className="text-gray-400 text-sm mb-8">Sign in with your email address</p>
                <form onSubmit={handleEmailLogin} className="space-y-3">
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" autoFocus required
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-4 py-3.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary/40 transition-all" />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input type={showEmailPw ? 'text' : 'password'} value={emailPassword} onChange={e => setEmailPassword(e.target.value)} placeholder="Password" required
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-11 py-3.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary/40 transition-all" />
                    <button type="button" onClick={() => setShowEmailPw(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showEmailPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {(emailLoginMutation.isError || workspaceSelectMutation.isError) && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-xs pl-1">
                      {((emailLoginMutation.error || workspaceSelectMutation.error) as Error)?.message}
                    </motion.p>
                  )}
                  <button type="submit"
                    disabled={emailLoginMutation.isPending || workspaceSelectMutation.isPending || !email || !emailPassword}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-gray-900 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 shadow-lg shadow-primary/20"
                  >
                    {(emailLoginMutation.isPending || workspaceSelectMutation.isPending)
                      ? <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                      : <>Continue <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </form>
                <p className="text-center text-xs text-gray-400 mt-6">
                  Don't have an account?{' '}
                  <button onClick={() => setIsSignupMode(true)} className="text-primary font-semibold hover:underline">Sign up free</button>
                </p>
              </motion.div>
            )}

            {/* ─── Email login — select workspace ─── */}
            {!isSignupMode && loginMode === 'email' && emailStep === 'select-workspace' && emailLoginData && (
              <motion.div key="email-ws-select" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.22 }}>
                <button onClick={resetEmailFlow} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-8">
                  <ChevronLeft className="w-3.5 h-3.5" /> Back
                </button>
                <h1 className="text-xl font-display font-bold text-gray-900 mb-1">
                  Hi, {emailLoginData.user.name.split(' ')[0]} 👋
                </h1>
                <p className="text-gray-400 text-sm mb-8">Choose a workspace to enter</p>
                <div className="space-y-2.5">
                  {emailLoginData.workspaces.map(ws => (
                    <motion.button key={ws.slug} onClick={() => handleEmailWorkspaceSelect(ws)}
                      whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.99 }}
                      disabled={workspaceSelectMutation.isPending}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-all text-left group disabled:opacity-60"
                    >
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ background: `${ws.color}18` }}>{ws.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{ws.name}</p>
                        {ws.description && <p className="text-gray-400 text-xs mt-0.5 line-clamp-1">{ws.description}</p>}
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400 shrink-0" />
                    </motion.button>
                  ))}
                </div>
                {workspaceSelectMutation.isError && (
                  <p className="text-red-400 text-xs mt-4">{(workspaceSelectMutation.error as Error)?.message}</p>
                )}
              </motion.div>
            )}

            {/* ─── Workspace picker ─── */}
            {!isSignupMode && loginMode === 'workspace' && step === 'pick' && (
              <motion.div key="pick" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.22 }}>
                <h1 className="text-2xl font-display font-bold text-gray-900 mb-1">Choose your workspace</h1>
                <p className="text-gray-400 text-sm mb-8">Select the business you'd like to access</p>
                <div className="space-y-2.5">
                  {workspaces.map(ws => (
                    <motion.button key={ws.slug} onClick={() => handleSelectWorkspace(ws)}
                      whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.99 }}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-all text-left group"
                    >
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ background: `${ws.color}18`, boxShadow: `0 0 20px ${ws.color}15` }}>{ws.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{ws.name}</p>
                        {ws.description && <p className="text-gray-400 text-xs mt-0.5 line-clamp-1">{ws.description}</p>}
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400 transition-colors shrink-0" />
                    </motion.button>
                  ))}
                </div>
                <p className="text-center text-xs text-gray-400 mt-8">
                  New to {BRAND.shortName}?{' '}
                  <button onClick={() => { setIsSignupMode(true); setLoginMode('email'); }} className="text-primary font-semibold hover:underline">Create an account</button>
                </p>
              </motion.div>
            )}

            {/* ─── Workspace password ─── */}
            {!isSignupMode && loginMode === 'workspace' && step === 'password' && selectedWorkspace && (
              <motion.div key="password" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.22 }}>
                <button onClick={handleBack} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-8">
                  <ChevronLeft className="w-3.5 h-3.5" /> All workspaces
                </button>
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl" style={{ background: `${selectedWorkspace.color}18`, boxShadow: `0 0 30px ${selectedWorkspace.color}20` }}>{selectedWorkspace.emoji}</div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-0.5">Signing in to</p>
                    <h1 className="text-xl font-display font-bold text-gray-900">{selectedWorkspace.name}</h1>
                  </div>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Workspace password" autoFocus
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-4 py-3.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-white/20 transition-all" />
                  </div>
                  {loginMutation.isError && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-xs pl-1">Incorrect password. Please try again.</motion.p>
                  )}
                  <button type="submit" disabled={loginMutation.isPending || !password}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-gray-900 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: selectedWorkspace.color, boxShadow: `0 4px 20px ${selectedWorkspace.color}35` }}
                  >
                    {loginMutation.isPending
                      ? <div className="w-4 h-4 border-2 border-gray-1000 border-t-white rounded-full animate-spin" />
                      : <>Enter workspace <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </form>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
