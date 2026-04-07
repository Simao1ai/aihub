import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Link2,
  Key, Trash2, CheckCircle2, RefreshCw, AlertTriangle,
  ChevronDown, ChevronUp, ExternalLink, Eye, EyeOff, X,
  ShieldCheck, Zap,
} from 'lucide-react';
import { cn } from '@/components/ui-elements';

// ── Types ────────────────────────────────────────────────────────────────────

interface PlatformStatus {
  configured: boolean;
  envVars: string[];
}

interface ConnectionStatus {
  meta?: PlatformStatus;
  linkedin?: PlatformStatus;
  google?: PlatformStatus;
  twitter?: PlatformStatus;
  tiktok?: PlatformStatus;
  gohighlevel?: PlatformStatus;
  email?: PlatformStatus;
}

// ── Platform Config ───────────────────────────────────────────────────────────

const PLATFORMS = [
  {
    key: 'meta',
    name: 'Meta (Facebook & Instagram)',
    emoji: '📘',
    color: '#1877F2',
    bg: '#1877F212',
    authType: 'oauth' as const,
    capabilities: ['Post to Facebook Pages', 'Post to Instagram', 'Run Ads', 'Boost posts'],
    setupUrl: 'https://developers.facebook.com/apps/',
    setupSteps: [
      'Go to developers.facebook.com and create an App',
      'Add "Facebook Login" and "Instagram Graph API" products',
      'In Settings → Basic, copy App ID and App Secret',
      'Add these as Secrets in Replit: META_APP_ID and META_APP_SECRET',
      'Set OAuth Redirect URI to your app domain + /api/connections/oauth/meta/callback',
    ],
    tokenInstructions: 'Get a long-lived Page Access Token from Meta Business Suite → Settings → Advanced → Page Access Tokens, or from the Graph API Explorer.',
  },
  {
    key: 'linkedin',
    name: 'LinkedIn',
    emoji: '💼',
    color: '#0A66C2',
    bg: '#0A66C212',
    authType: 'oauth' as const,
    capabilities: ['Post to LinkedIn', 'Share articles', 'Company page posts'],
    setupUrl: 'https://www.linkedin.com/developers/apps',
    setupSteps: [
      'Go to linkedin.com/developers and create an App',
      'In Auth tab, copy Client ID and Client Secret',
      'Add as Secrets: LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET',
      'Add OAuth Redirect URL: your-domain/api/connections/oauth/linkedin/callback',
      'Request permissions: w_member_social, r_basicprofile',
    ],
    tokenInstructions: 'Generate an OAuth2 access token from the LinkedIn Developer Portal → Token Generator with w_member_social scope.',
  },
  {
    key: 'twitter',
    name: 'X / Twitter',
    emoji: '🐦',
    color: '#1DA1F2',
    bg: '#1DA1F212',
    authType: 'oauth' as const,
    capabilities: ['Post tweets', 'Send DMs', 'Reply to mentions', 'Read timeline'],
    setupUrl: 'https://developer.twitter.com/en/portal/dashboard',
    setupSteps: [
      'Go to developer.twitter.com and create a Project + App',
      'Enable OAuth 2.0 with User authentication settings',
      'Copy Client ID and Client Secret',
      'Add as Secrets: TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET',
      'Set Callback URL to: your-domain/api/connections/oauth/twitter/callback',
    ],
    tokenInstructions: 'Generate a Bearer Token or User Access Token from the Twitter Developer Portal under your App → Keys and Tokens.',
  },
  {
    key: 'tiktok',
    name: 'TikTok',
    emoji: '🎵',
    color: '#FF0050',
    bg: '#FF005012',
    authType: 'token' as const,
    capabilities: ['Schedule TikTok videos', 'Draft captions', 'Track analytics'],
    setupUrl: 'https://developers.tiktok.com/',
    setupSteps: [
      'Go to developers.tiktok.com and create an app',
      'Enable Content Posting API',
      'Use TikTok for Business to generate a long-lived access token',
      'Paste the token below using "Connect with Token"',
    ],
    tokenInstructions: 'From TikTok for Business → Tools → API Access, generate a long-lived access token with video.upload and user.info.basic scopes.',
  },
  {
    key: 'google',
    name: 'Gmail / Google',
    emoji: '📧',
    color: '#EA4335',
    bg: '#EA433512',
    authType: 'oauth' as const,
    capabilities: ['Send emails', 'Read inbox', 'Draft responses', 'Calendar'],
    setupUrl: 'https://console.cloud.google.com/',
    setupSteps: [
      'Go to console.cloud.google.com and create a Project',
      'Enable Gmail API and Google Calendar API',
      'Create OAuth 2.0 credentials (Web Application type)',
      'Copy Client ID and Client Secret',
      'Add as Secrets: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET',
      'Add Authorized redirect URI: your-domain/api/connections/oauth/google/callback',
    ],
    tokenInstructions: 'Use the OAuth Playground (developers.google.com/oauthplayground) to generate tokens with gmail.send and gmail.readonly scopes.',
  },
  {
    key: 'gohighlevel',
    name: 'GoHighLevel',
    emoji: '⚡',
    color: '#0052CC',
    bg: '#0052CC12',
    authType: 'token' as const,
    capabilities: ['Send SMS', 'Manage contacts', 'Create pipelines', 'Automations'],
    setupUrl: 'https://app.gohighlevel.com/',
    setupSteps: [
      'Log in to GoHighLevel',
      'Go to Settings → API Keys',
      'Create a new API key with the required permissions',
      'Copy the key and paste it below',
    ],
    tokenInstructions: 'Find your API key under GoHighLevel → Settings → API Keys. Use a key with Contacts, Conversations, and Campaigns permissions.',
  },
];

// ── Setup Guide Modal ─────────────────────────────────────────────────────────

function SetupGuide({
  platform, onClose, onTokenSubmit,
}: {
  platform: typeof PLATFORMS[0];
  onClose: () => void;
  onTokenSubmit: (token: string, label: string) => void;
}) {
  const [tab, setTab] = useState<'oauth' | 'token'>('oauth');
  const [token, setToken] = useState('');
  const [label, setLabel] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!token.trim()) return;
    setSaving(true);
    await onTokenSubmit(token.trim(), label.trim() || platform.name);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        className="relative w-full sm:max-w-xl bg-[#111520] border border-white/8 rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl"
      >
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: platform.bg }}>
            {platform.emoji}
          </div>
          <div>
            <p className="font-semibold text-white">{platform.name}</p>
            <p className="text-xs text-white/35">Choose how to connect</p>
          </div>
          <button onClick={onClose} className="ml-auto w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        {platform.authType === 'oauth' && (
          <div className="flex mx-5 mt-4 bg-white/4 rounded-xl p-1 gap-1">
            <button onClick={() => setTab('oauth')} className={cn("flex-1 py-2 rounded-lg text-xs font-semibold transition-all", tab === 'oauth' ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60")}>
              🔐 OAuth (Recommended)
            </button>
            <button onClick={() => setTab('token')} className={cn("flex-1 py-2 rounded-lg text-xs font-semibold transition-all", tab === 'token' ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60")}>
              🔑 Paste Token
            </button>
          </div>
        )}

        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* OAuth Setup Steps */}
          {(tab === 'oauth' || platform.authType !== 'oauth') && platform.authType === 'oauth' && (
            <div>
              <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Setup Steps</p>
              <div className="space-y-2.5">
                {platform.setupSteps.map((step, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span className="w-6 h-6 rounded-full bg-primary/15 text-primary text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                    <p className="text-sm text-white/60 leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
              <a href={platform.setupUrl} target="_blank" rel="noopener noreferrer"
                className="mt-4 flex items-center gap-2 text-xs text-primary hover:text-primary/80 transition-all">
                <ExternalLink className="w-3.5 h-3.5" /> Open {platform.name} Developer Portal
              </a>
              <div className="mt-4 p-3 rounded-xl bg-amber-500/8 border border-amber-500/15">
                <p className="text-xs text-amber-400 font-semibold mb-1">After setting your secrets</p>
                <p className="text-[11px] text-white/40">The API server must be restarted to pick up new environment variables. Click Restart on the API Server workflow, then come back and click "Connect with OAuth".</p>
              </div>
            </div>
          )}

          {/* Token-only setup steps */}
          {platform.authType === 'token' && (
            <div>
              <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">How to get your token</p>
              <div className="space-y-2.5">
                {platform.setupSteps.map((step, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span className="w-6 h-6 rounded-full bg-primary/15 text-primary text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                    <p className="text-sm text-white/60 leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Paste Token form */}
          {(tab === 'token' || platform.authType === 'token') && (
            <div className="space-y-3">
              {tab === 'token' && (
                <div className="p-3 rounded-xl bg-blue-500/8 border border-blue-500/15">
                  <p className="text-[11px] text-blue-300 leading-relaxed">{platform.tokenInstructions}</p>
                </div>
              )}
              <div>
                <label className="text-xs text-white/40 mb-1.5 block">Account Label (optional)</label>
                <input value={label} onChange={e => setLabel(e.target.value)}
                  placeholder={`e.g. Simao's ${platform.name}`}
                  className="w-full bg-white/4 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40" />
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1.5 block">Access Token <span className="text-red-400">*</span></label>
                <div className="relative">
                  <input type={show ? 'text' : 'password'} value={token} onChange={e => setToken(e.target.value)}
                    placeholder="Paste your access token here…"
                    className="w-full bg-white/4 border border-white/8 rounded-xl px-3 pr-10 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40 font-mono" />
                  <button onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50">
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button onClick={handleSave} disabled={saving || !token.trim()}
                className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2">
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                {saving ? 'Saving…' : 'Save Token & Connect'}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── Platform Card ─────────────────────────────────────────────────────────────

function PlatformCard({
  platform, connection, status,
  onOAuth, onSetup, onDisconnect, onTest,
}: {
  platform: typeof PLATFORMS[0];
  connection: any;
  status: PlatformStatus | undefined;
  onOAuth: () => void;
  onSetup: () => void;
  onDisconnect: (id: number) => void;
  onTest: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isConnected = !!connection?.hasToken;
  const isOAuth = platform.authType === 'oauth';
  const oauthReady = isOAuth ? (status?.configured ?? false) : true;

  return (
    <div className={cn(
      "bg-[#111520] border rounded-2xl overflow-hidden transition-all",
      isConnected ? "border-emerald-500/20" : "border-white/6"
    )}>
      {/* Platform color glow */}
      <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full blur-3xl opacity-5 pointer-events-none" style={{ background: platform.color }} />

      <div className="relative p-5">
        {/* Header row */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: platform.bg, border: `1px solid ${platform.color}20` }}>
            {platform.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-white text-sm">{platform.name}</p>
              {isConnected ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Connected
                </span>
              ) : isOAuth && !oauthReady ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-semibold">
                  <AlertTriangle className="w-2.5 h-2.5" /> Setup Required
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/8 text-white/30 text-[10px]">Not Connected</span>
              )}
            </div>
            {isConnected && connection.accountLabel && (
              <p className="text-xs text-white/35 mt-0.5 truncate">{connection.accountLabel}</p>
            )}
          </div>
        </div>

        {/* Capabilities pills */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {platform.capabilities.map(cap => (
            <span key={cap} className="px-2 py-1 rounded-lg text-[10px] font-medium bg-white/4 border border-white/6 text-white/40">{cap}</span>
          ))}
        </div>

        {/* Action buttons */}
        {isConnected ? (
          <div className="flex gap-2">
            <button onClick={() => onTest(connection.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/8 border border-white/8 text-white/60 hover:text-white text-xs font-medium transition-all">
              <RefreshCw className="w-3.5 h-3.5" /> Test Connection
            </button>
            <button onClick={() => onDisconnect(connection.id)}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-500/8 hover:bg-red-500/15 border border-red-500/15 text-red-400/60 hover:text-red-400 transition-all">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : isOAuth && oauthReady ? (
          <div className="flex gap-2">
            <button onClick={onOAuth}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-xs font-semibold transition-all"
              style={{ background: `${platform.color}20`, border: `1px solid ${platform.color}35`, color: platform.color }}>
              <ShieldCheck className="w-3.5 h-3.5" /> Connect with OAuth
            </button>
            <button onClick={onSetup}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/8 border border-white/8 text-white/40 hover:text-white transition-all">
              <Key className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button onClick={onSetup}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 hover:bg-white/8 border border-white/8 text-white/60 hover:text-white text-xs font-semibold transition-all">
            {isOAuth ? (
              <><AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Setup Required — View Instructions</>
            ) : (
              <><Key className="w-3.5 h-3.5" /> Connect with Token</>
            )}
          </button>
        )}

        {/* Expand: setup env var info */}
        {isOAuth && !oauthReady && !isConnected && (
          <button onClick={() => setExpanded(e => !e)}
            className="mt-2 w-full flex items-center justify-center gap-1 text-[10px] text-white/20 hover:text-white/40 transition-all">
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? 'Hide' : 'Which secrets do I need?'}
          </button>
        )}

        <AnimatePresence>
          {expanded && isOAuth && !oauthReady && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="mt-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                <p className="text-[10px] text-amber-400 font-semibold mb-1.5">Add these to Replit Secrets:</p>
                {status?.envVars.map(v => (
                  <code key={v} className="block text-[11px] text-white/50 font-mono bg-white/5 rounded px-2 py-1 mb-1">{v}</code>
                ))}
                <p className="text-[10px] text-white/30 mt-1.5">Settings → Secrets in your Replit project</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Test Result Toast ─────────────────────────────────────────────────────────

function TestToast({ result, onClose }: { result: { success: boolean; message: string } | null; onClose: () => void }) {
  if (!result) return null;
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
      className={cn("fixed bottom-24 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl border shadow-xl text-sm font-medium max-w-sm w-[90vw]",
        result.success ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"
      )}
    >
      {result.success ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
      <p className="flex-1 text-xs">{result.message}</p>
      <button onClick={onClose}><X className="w-3.5 h-3.5" /></button>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Connections() {
  const [connections, setConnections]       = useState<any[]>([]);
  const [platformStatus, setPlatformStatus] = useState<ConnectionStatus>({});
  const [setupPlatform, setSetupPlatform]   = useState<typeof PLATFORMS[0] | null>(null);
  const [testResult, setTestResult]         = useState<{ success: boolean; message: string } | null>(null);

  const loadConnections = useCallback(async () => {
    try {
      const res = await fetch('/api/connections');
      if (res.ok) setConnections(await res.json());
    } catch {}
  }, []);

  // Load connections + status
  useEffect(() => {
    loadConnections();
    fetch('/api/connections/status').then(r => r.json()).then(setPlatformStatus).catch(() => {});
  }, [loadConnections]);

  // Initiate OAuth for a platform
  const handleOAuth = async (platformKey: string) => {
    try {
      const res = await fetch(`/api/connections/oauth/${platformKey}/initiate`);
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        setTestResult({ success: false, message: data.message ?? data.error });
      }
    } catch {
      setTestResult({ success: false, message: 'Failed to start OAuth flow' });
    }
  };

  // Save a manual token
  const handleTokenSave = async (platformKey: string, token: string, label: string) => {
    try {
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: platformKey, apiKey: token, accountLabel: label }),
      });
      if (!res.ok) throw new Error('Failed');
      await loadConnections();
      setSetupPlatform(null);
      setTestResult({ success: true, message: `${label || platformKey} connected successfully!` });
    } catch {
      setTestResult({ success: false, message: 'Failed to save token' });
    }
  };

  // Test a connection
  const handleTest = async (id: number) => {
    try {
      const res = await fetch(`/api/connections/${id}/test`, { method: 'POST' });
      const data = await res.json();
      setTestResult({ success: data?.success ?? true, message: data?.message ?? 'Connection tested' });
    } catch {
      setTestResult({ success: false, message: 'Test failed' });
    }
  };

  // Disconnect
  const handleDisconnect = async (id: number) => {
    if (!confirm('Disconnect this platform? Any automations using it will stop working.')) return;
    try {
      await fetch(`/api/connections/${id}`, { method: 'DELETE' });
      await loadConnections();
      setTestResult({ success: true, message: 'Platform disconnected' });
    } catch {
      setTestResult({ success: false, message: 'Failed to disconnect' });
    }
  };

  const connectedCount = connections.filter((c: any) => c.hasToken).length;

  return (
    <div className="h-full overflow-y-auto">

      {/* Header */}
      <div className="sticky top-0 z-10 px-4 sm:px-8 pt-4 sm:pt-8 pb-4 bg-[#0c0e16]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-xl sm:text-2xl font-display font-bold text-white flex items-center gap-2">
            <Link2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> Connections
          </h1>
          <p className="text-sm text-white/35 mt-0.5">
            {connectedCount > 0
              ? `${connectedCount} of ${PLATFORMS.length} platforms connected`
              : 'Connect your social media and business tools'}
          </p>
        </div>
      </div>

      <div className="px-4 sm:px-8 py-5 sm:py-8 max-w-5xl mx-auto space-y-5">

        {/* Info banner */}
        <div className="flex gap-3 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/15">
          <Zap className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-blue-400 mb-0.5">How connections work</p>
            <p className="text-[11px] text-white/40 leading-relaxed">
              OAuth platforms (Meta, LinkedIn, Twitter, Google) require a developer app with credentials set as Replit Secrets.
              Token platforms (TikTok, GoHighLevel) only need you to paste an access token directly.
              Once connected, your AI agents can post content, send messages, and automate workflows.
            </p>
          </div>
        </div>

        {/* Platform grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PLATFORMS.map(platform => {
            const connection = connections.find((c: any) => c.platform === platform.key);
            const status = platformStatus[platform.key as keyof ConnectionStatus];
            return (
              <PlatformCard
                key={platform.key}
                platform={platform}
                connection={connection}
                status={status}
                onOAuth={() => handleOAuth(platform.key)}
                onSetup={() => setSetupPlatform(platform)}
                onDisconnect={handleDisconnect}
                onTest={handleTest}
              />
            );
          })}
        </div>

        {/* Footer note */}
        <div className="text-center pt-2">
          <p className="text-[11px] text-white/20">
            Access tokens are encrypted and stored securely. Your agents only get the permissions you grant.
          </p>
        </div>
      </div>

      {/* Setup Guide Modal */}
      <AnimatePresence>
        {setupPlatform && (
          <SetupGuide
            platform={setupPlatform}
            onClose={() => setSetupPlatform(null)}
            onTokenSubmit={(token, label) => handleTokenSave(setupPlatform.key, token, label)}
          />
        )}
      </AnimatePresence>

      {/* Test Toast */}
      <AnimatePresence>
        {testResult && <TestToast result={testResult} onClose={() => setTestResult(null)} />}
      </AnimatePresence>
    </div>
  );
}
