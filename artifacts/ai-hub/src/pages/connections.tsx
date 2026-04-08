import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Link2, Key, Trash2, CheckCircle2, RefreshCw, AlertTriangle,
  ExternalLink, Eye, EyeOff, X, ShieldCheck, Zap, ChevronRight,
  Copy, Check, ArrowRight, Info,
} from 'lucide-react';
import { cn } from '@/components/ui-elements';

// ── Types ─────────────────────────────────────────────────────────────────────

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
}

// ── Platform Definitions ──────────────────────────────────────────────────────

const PLATFORMS = [
  {
    key: 'meta',
    name: 'Meta',
    subLabel: 'Facebook & Instagram',
    emoji: '📘',
    color: '#1877F2',
    bg: '#1877F215',
    authType: 'oauth' as const,
    envVars: ['META_APP_ID', 'META_APP_SECRET'],
    capabilities: ['Post to Facebook Pages', 'Post to Instagram', 'Run Ads'],
    difficulty: 'Medium',
    timeEstimate: '~5 min',
    quickGuide: {
      title: 'Get your Meta App credentials',
      steps: [
        { text: 'Go to developers.facebook.com → My Apps → Create App', link: 'https://developers.facebook.com/apps/create/' },
        { text: 'Choose "Business" type → give it any name → Create' },
        { text: 'In Settings → Basic, copy your App ID and App Secret' },
        { text: 'Add "Facebook Login" product → set redirect URI below' },
        { text: 'Paste both values below as META_APP_ID and META_APP_SECRET' },
      ],
      redirectPath: '/api/connections/oauth/meta/callback',
      tokenGuide: 'Go to: Graph API Explorer → Select your app → Generate token with pages_manage_posts + instagram_basic scopes. Then click "Get Long-Lived Token".',
      tokenLink: 'https://developers.facebook.com/tools/explorer/',
    },
  },
  {
    key: 'linkedin',
    name: 'LinkedIn',
    subLabel: 'Posts & Company Pages',
    emoji: '💼',
    color: '#0A66C2',
    bg: '#0A66C215',
    authType: 'oauth' as const,
    envVars: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET'],
    capabilities: ['Post to LinkedIn', 'Share articles', 'Company page posts'],
    difficulty: 'Easy',
    timeEstimate: '~4 min',
    quickGuide: {
      title: 'Get your LinkedIn App credentials',
      steps: [
        { text: 'Go to linkedin.com/developers → Create App', link: 'https://www.linkedin.com/developers/apps/new' },
        { text: 'Fill in app name + LinkedIn Page (can use your personal profile page)' },
        { text: 'In the "Auth" tab, copy Client ID and Client Secret' },
        { text: 'Add the redirect URL below under "Authorized redirect URLs for your app"' },
        { text: 'In the "Products" tab, request "Share on LinkedIn" + "Sign In with LinkedIn"' },
      ],
      redirectPath: '/api/connections/oauth/linkedin/callback',
      tokenGuide: 'In your LinkedIn Developer App → Auth tab → click "Request access token" or use the OAuth Token Generator tool to get a token with w_member_social scope.',
      tokenLink: 'https://www.linkedin.com/developers/tools/oauth/token-generator',
    },
  },
  {
    key: 'twitter',
    name: 'X / Twitter',
    subLabel: 'Tweets & Scheduling',
    emoji: '🐦',
    color: '#000000',
    bg: '#ffffff12',
    authType: 'oauth' as const,
    envVars: ['TWITTER_CLIENT_ID', 'TWITTER_CLIENT_SECRET'],
    capabilities: ['Post tweets', 'Send DMs', 'Reply to mentions'],
    difficulty: 'Medium',
    timeEstimate: '~6 min',
    quickGuide: {
      title: 'Get your Twitter/X App credentials',
      steps: [
        { text: 'Go to developer.twitter.com → Create Project → Create App', link: 'https://developer.twitter.com/en/portal/apps/new' },
        { text: 'In App Settings → User authentication settings → enable OAuth 2.0' },
        { text: 'Set App permissions to "Read and Write"' },
        { text: 'Set Callback URL to your redirect URI below' },
        { text: 'Copy Client ID and Client Secret from "Keys and Tokens"' },
      ],
      redirectPath: '/api/connections/oauth/twitter/callback',
      tokenGuide: 'From your Twitter App → Keys and Tokens tab → Generate "Access Token and Secret" (OAuth 1.0a) or use OAuth 2.0 Bearer Token. For posting, you need User Auth tokens, not just Bearer.',
      tokenLink: 'https://developer.twitter.com/en/portal/dashboard',
    },
  },
  {
    key: 'google',
    name: 'Gmail / Google',
    subLabel: 'Email & Calendar',
    emoji: '📧',
    color: '#EA4335',
    bg: '#EA433515',
    authType: 'oauth' as const,
    envVars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    capabilities: ['Send emails via Gmail', 'Read inbox', 'Draft responses'],
    difficulty: 'Hard',
    timeEstimate: '~10 min',
    quickGuide: {
      title: 'Get your Google OAuth credentials',
      steps: [
        { text: 'Go to console.cloud.google.com → New Project', link: 'https://console.cloud.google.com/projectcreate' },
        { text: 'Enable APIs: search "Gmail API" → Enable it', link: 'https://console.cloud.google.com/apis/library/gmail.googleapis.com' },
        { text: 'Go to APIs & Services → Credentials → Create Credentials → OAuth Client ID' },
        { text: 'Choose "Web Application" → paste the redirect URI below under Authorized Redirect URIs' },
        { text: 'Copy Client ID and Client Secret' },
      ],
      redirectPath: '/api/connections/oauth/google/callback',
      tokenGuide: 'Use the OAuth 2.0 Playground: go to the link below, select "Gmail API v1" → authorize → exchange code for tokens. Copy the Access Token and Refresh Token.',
      tokenLink: 'https://developers.google.com/oauthplayground',
    },
  },
  {
    key: 'tiktok',
    name: 'TikTok',
    subLabel: 'Video & Short Content',
    emoji: '🎵',
    color: '#FF0050',
    bg: '#FF005015',
    authType: 'token' as const,
    envVars: [],
    capabilities: ['Schedule TikTok videos', 'Draft captions', 'Track analytics'],
    difficulty: 'Easy',
    timeEstimate: '~3 min',
    quickGuide: {
      title: 'Get your TikTok access token',
      steps: [
        { text: 'Go to TikTok for Business → Tools → API Access', link: 'https://business-api.tiktok.com/portal/tools/api-access' },
        { text: 'Create an app or use an existing one' },
        { text: 'Generate a Long-Lived Access Token with video.upload and user.info.basic scopes' },
        { text: 'Copy the token and paste it below' },
      ],
      redirectPath: '',
      tokenGuide: 'A TikTok for Business account is required. If you only have a personal TikTok, you can apply for API access at developers.tiktok.com.',
      tokenLink: 'https://developers.tiktok.com/',
    },
  },
  {
    key: 'gohighlevel',
    name: 'GoHighLevel',
    subLabel: 'CRM & Messaging',
    emoji: '⚡',
    color: '#0052CC',
    bg: '#0052CC15',
    authType: 'token' as const,
    envVars: [],
    capabilities: ['Send SMS', 'Manage contacts', 'Create pipelines'],
    difficulty: 'Easy',
    timeEstimate: '~2 min',
    quickGuide: {
      title: 'Get your GoHighLevel API key',
      steps: [
        { text: 'Log into GoHighLevel', link: 'https://app.gohighlevel.com/' },
        { text: 'Go to Settings → API Keys (in the left sidebar)' },
        { text: 'Click "Create API Key" → give it a name → select permissions' },
        { text: 'Copy the API key and paste it below' },
      ],
      redirectPath: '',
      tokenGuide: 'Use a key with Contacts, Conversations, and Campaigns permissions for full functionality.',
      tokenLink: 'https://app.gohighlevel.com/settings/api-keys',
    },
  },
];

const DIFFICULTY_COLOR = {
  Easy: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  Medium: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  Hard: 'text-red-400 bg-red-400/10 border-red-400/20',
};

// ── Copy Button ───────────────────────────────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1 rounded text-white/25 hover:text-white/60 transition-all flex-shrink-0"
      title="Copy"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ── Setup Drawer ──────────────────────────────────────────────────────────────

function SetupDrawer({
  platform,
  status,
  baseUrl,
  onClose,
  onOAuth,
  onTokenSubmit,
}: {
  platform: typeof PLATFORMS[0];
  status?: PlatformStatus;
  baseUrl: string;
  onClose: () => void;
  onOAuth: () => void;
  onTokenSubmit: (token: string, label: string) => void;
}) {
  const [mode, setMode] = useState<'guide' | 'token'>(platform.authType === 'token' ? 'token' : 'guide');
  const [token, setToken] = useState('');
  const [label, setLabel] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);

  const redirectUri = baseUrl ? `${baseUrl}${platform.quickGuide.redirectPath}` : `https://your-app.replit.app${platform.quickGuide.redirectPath}`;
  const oauthReady = status?.configured ?? false;

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
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        className="relative w-full sm:max-w-lg bg-[#0f1119] border border-white/8 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-white/15" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/6">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: platform.bg }}>
            {platform.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white">{platform.name}</p>
            <p className="text-xs text-white/35">{platform.subLabel}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", DIFFICULTY_COLOR[platform.difficulty as keyof typeof DIFFICULTY_COLOR])}>
              {platform.difficulty}
            </span>
            <span className="text-[10px] text-white/30 bg-white/5 px-2 py-0.5 rounded-full border border-white/8">{platform.timeEstimate}</span>
            <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/30 hover:text-white transition-all ml-1">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tab switcher (only for oauth platforms) */}
        {platform.authType === 'oauth' && (
          <div className="flex mx-5 mt-4 bg-white/4 rounded-xl p-1 gap-1">
            <button
              onClick={() => setMode('guide')}
              className={cn("flex-1 py-2 rounded-lg text-xs font-semibold transition-all", mode === 'guide' ? "bg-white/10 text-white" : "text-white/35 hover:text-white/55")}
            >
              🔐 OAuth (Recommended)
            </button>
            <button
              onClick={() => setMode('token')}
              className={cn("flex-1 py-2 rounded-lg text-xs font-semibold transition-all", mode === 'token' ? "bg-white/10 text-white" : "text-white/35 hover:text-white/55")}
            >
              🔑 Paste Token
            </button>
          </div>
        )}

        <div className="px-5 py-4 space-y-4 max-h-[65vh] overflow-y-auto">

          {/* ── OAUTH GUIDE MODE ── */}
          {mode === 'guide' && platform.authType === 'oauth' && (
            <>
              <div>
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">{platform.quickGuide.title}</p>
                <div className="space-y-2">
                  {platform.quickGuide.steps.map((step, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                      <div className="flex-1">
                        <p className="text-sm text-white/65 leading-relaxed">{step.text}</p>
                        {step.link && (
                          <a href={step.link} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-primary/70 hover:text-primary mt-0.5 transition-all">
                            <ExternalLink className="w-3 h-3" /> Open link
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Redirect URI */}
              {platform.quickGuide.redirectPath && (
                <div>
                  <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">Your Redirect URI (copy this into the developer portal)</p>
                  <div className="flex items-center gap-2 bg-white/4 border border-white/8 rounded-xl px-3 py-2.5">
                    <code className="text-[11px] text-emerald-300 font-mono flex-1 break-all leading-relaxed">{redirectUri}</code>
                    <CopyBtn text={redirectUri} />
                  </div>
                </div>
              )}

              {/* Env vars needed */}
              {platform.envVars.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">Add these to Replit → Secrets</p>
                  <div className="space-y-1.5">
                    {platform.envVars.map(v => (
                      <div key={v} className="flex items-center gap-2 bg-white/4 border border-white/8 rounded-xl px-3 py-2">
                        <code className="text-[11px] text-amber-300 font-mono flex-1">{v}</code>
                        <CopyBtn text={v} />
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-white/25 mt-1.5">In Replit: click the lock icon (🔒) in the sidebar → Secrets → add each one</p>
                </div>
              )}

              {/* Status indicator */}
              <div className={cn(
                "flex items-start gap-2.5 p-3 rounded-xl border text-xs",
                oauthReady
                  ? "bg-emerald-500/8 border-emerald-500/15 text-emerald-400"
                  : "bg-amber-500/8 border-amber-500/15 text-amber-400"
              )}>
                {oauthReady
                  ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  : <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                }
                <div>
                  <p className="font-semibold">
                    {oauthReady ? 'Secrets detected — ready to connect!' : 'Secrets not yet set'}
                  </p>
                  <p className="text-[11px] opacity-70 mt-0.5">
                    {oauthReady
                      ? 'Click the button below to start the OAuth flow in your browser.'
                      : 'Add your secrets in Replit, restart the API Server workflow, then come back.'}
                  </p>
                </div>
              </div>

              <button
                onClick={onOAuth}
                disabled={!oauthReady}
                className={cn(
                  "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all",
                  oauthReady
                    ? "text-white hover:opacity-90"
                    : "opacity-35 cursor-not-allowed bg-white/5 border border-white/8 text-white/40"
                )}
                style={oauthReady ? { background: platform.color } : undefined}
              >
                <ShieldCheck className="w-4 h-4" />
                {oauthReady ? `Connect ${platform.name} with OAuth` : 'Add Secrets First'}
              </button>
            </>
          )}

          {/* ── TOKEN MODE ── */}
          {(mode === 'token' || platform.authType === 'token') && (
            <>
              {/* Token instructions */}
              <div className="p-3.5 rounded-xl bg-blue-500/8 border border-blue-500/15 space-y-2">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-blue-400 mb-1">How to get your token</p>
                    <p className="text-[11px] text-white/50 leading-relaxed">{platform.quickGuide.tokenGuide}</p>
                  </div>
                </div>
                <a href={platform.quickGuide.tokenLink} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] text-blue-400 hover:text-blue-300 transition-all font-medium">
                  <ExternalLink className="w-3 h-3" /> Open {platform.name} token page
                </a>
              </div>

              {/* Step-by-step for token platforms */}
              {platform.authType === 'token' && (
                <div>
                  <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Steps</p>
                  <div className="space-y-2">
                    {platform.quickGuide.steps.map((step, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                        <div className="flex-1">
                          <p className="text-sm text-white/65 leading-relaxed">{step.text}</p>
                          {step.link && (
                            <a href={step.link} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-primary/70 hover:text-primary mt-0.5 transition-all">
                              <ExternalLink className="w-3 h-3" /> Open link
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Token input */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-white/40 mb-1.5 block">Account Label <span className="text-white/20">(optional)</span></label>
                  <input
                    value={label}
                    onChange={e => setLabel(e.target.value)}
                    placeholder={`e.g. Simao — ${platform.name}`}
                    className="w-full bg-white/4 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1.5 block">
                    Access Token <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showToken ? 'text' : 'password'}
                      value={token}
                      onChange={e => setToken(e.target.value)}
                      placeholder="Paste your access token here…"
                      className="w-full bg-white/4 border border-white/8 rounded-xl px-3 pr-10 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40 font-mono transition-all"
                    />
                    <button
                      onClick={() => setShowToken(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-all"
                    >
                      {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving || !token.trim()}
                  className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-35 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                  {saving ? 'Saving…' : 'Save & Connect'}
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── Platform Card ─────────────────────────────────────────────────────────────

function PlatformCard({
  platform, connection, status,
  onSetup, onDisconnect, onTest, onOAuth,
}: {
  platform: typeof PLATFORMS[0];
  connection: any;
  status?: PlatformStatus;
  onSetup: () => void;
  onDisconnect: (id: number) => void;
  onTest: (id: number) => void;
  onOAuth: () => void;
}) {
  const isConnected = !!connection?.hasToken;
  const isOAuth = platform.authType === 'oauth';
  const oauthReady = isOAuth ? (status?.configured ?? false) : true;

  return (
    <motion.div
      layout
      className={cn(
        "relative rounded-2xl border overflow-hidden transition-all",
        isConnected
          ? "border-emerald-500/25 bg-[#0f1119]"
          : "border-white/6 bg-[#0f1119] hover:border-white/12"
      )}
    >
      {/* Color accent top bar */}
      <div className="h-0.5 w-full" style={{ background: isConnected ? '#10b981' : `${platform.color}40` }} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: platform.bg }}>
            {platform.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-white text-sm">{platform.name}</p>
              {isConnected ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/12 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Connected
                </span>
              ) : (
                <span className={cn(
                  "text-[10px] font-semibold px-1.5 py-0.5 rounded-full border",
                  DIFFICULTY_COLOR[platform.difficulty as keyof typeof DIFFICULTY_COLOR]
                )}>
                  {platform.difficulty} · {platform.timeEstimate}
                </span>
              )}
            </div>
            <p className="text-[11px] text-white/30 mt-0.5">
              {isConnected ? connection.accountLabel || platform.subLabel : platform.subLabel}
            </p>
          </div>
        </div>

        {/* Capabilities */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {platform.capabilities.map(cap => (
            <span key={cap} className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-white/4 border border-white/6 text-white/35">
              {cap}
            </span>
          ))}
        </div>

        {/* Actions */}
        {isConnected ? (
          <div className="flex gap-2">
            <button
              onClick={() => onTest(connection.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/8 border border-white/8 text-white/55 hover:text-white text-xs font-semibold transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Test
            </button>
            <button
              onClick={() => onSetup()}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/8 border border-white/8 text-white/55 hover:text-white text-xs font-semibold transition-all"
            >
              <Key className="w-3.5 h-3.5" /> Re-connect
            </button>
            <button
              onClick={() => onDisconnect(connection.id)}
              className="w-10 flex items-center justify-center rounded-xl bg-red-500/6 hover:bg-red-500/12 border border-red-500/12 text-red-400/50 hover:text-red-400 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={onSetup}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all border"
            style={{
              background: `${platform.color}15`,
              borderColor: `${platform.color}30`,
              color: platform.color,
            }}
          >
            {isOAuth && oauthReady ? (
              <><ShieldCheck className="w-3.5 h-3.5" /> Connect with OAuth</>
            ) : isOAuth && !oauthReady ? (
              <><Key className="w-3.5 h-3.5" /> View Setup Guide</>
            ) : (
              <><Key className="w-3.5 h-3.5" /> Connect with Token</>
            )}
            <ChevronRight className="w-3.5 h-3.5 ml-auto" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ── Quick Start Banner ────────────────────────────────────────────────────────

function QuickStartBanner({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 sm:p-5 rounded-2xl bg-primary/8 border border-primary/15">
      <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
        <Zap className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white">No platforms connected yet</p>
        <p className="text-[11px] text-white/40 mt-0.5 leading-relaxed">
          Connect Meta or LinkedIn first — they're easiest and most used. Each platform has a step-by-step guide built in.
        </p>
      </div>
      <button
        onClick={onStart}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold transition-all flex-shrink-0 whitespace-nowrap"
      >
        Start with LinkedIn <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Test Toast ────────────────────────────────────────────────────────────────

function TestToast({ result, onClose }: { result: { success: boolean; message: string } | null; onClose: () => void }) {
  if (!result) return null;
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
      className={cn(
        "fixed bottom-24 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl border shadow-xl text-sm font-medium max-w-sm w-[90vw]",
        result.success
          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
          : "bg-red-500/10 border-red-500/20 text-red-400"
      )}
    >
      {result.success
        ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
        : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
      <p className="flex-1 text-xs">{result.message}</p>
      <button onClick={onClose}><X className="w-3.5 h-3.5" /></button>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Connections() {
  const [connections, setConnections] = useState<any[]>([]);
  const [platformStatus, setPlatformStatus] = useState<ConnectionStatus>({});
  const [setupPlatform, setSetupPlatform] = useState<typeof PLATFORMS[0] | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [baseUrl, setBaseUrl] = useState('');

  const loadConnections = useCallback(async () => {
    try {
      const res = await fetch('/api/connections');
      if (res.ok) setConnections(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    loadConnections();
    fetch('/api/connections/status').then(r => r.json()).then(setPlatformStatus).catch(() => {});

    // Derive base URL from current window location for redirect URI display
    const proto = window.location.protocol;
    const host = window.location.host;
    setBaseUrl(`${proto}//${host}`);
  }, [loadConnections]);

  // Handle OAuth result query params on page load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('oauth_success');
    const error = params.get('oauth_error');
    const platform = params.get('platform');
    if (success) {
      setTestResult({ success: true, message: `${platform || 'Platform'} connected successfully!` });
      loadConnections();
      window.history.replaceState({}, '', window.location.pathname);
    } else if (error) {
      setTestResult({ success: false, message: `OAuth failed for ${platform || 'platform'}: ${error}` });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [loadConnections]);

  const handleOAuth = async (platformKey: string) => {
    try {
      const res = await fetch(`/api/connections/oauth/${platformKey}/initiate`);
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setTestResult({ success: false, message: data.message ?? data.error ?? 'Failed to start OAuth' });
      }
    } catch {
      setTestResult({ success: false, message: 'Failed to start OAuth flow' });
    }
  };

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
      setTestResult({ success: true, message: `${label || platformKey} connected!` });
    } catch {
      setTestResult({ success: false, message: 'Failed to save token' });
    }
  };

  const handleTest = async (id: number) => {
    try {
      const res = await fetch(`/api/connections/${id}/test`, { method: 'POST' });
      const data = await res.json();
      setTestResult({ success: data?.success ?? true, message: data?.message ?? 'Connection tested' });
    } catch {
      setTestResult({ success: false, message: 'Test failed' });
    }
  };

  const handleDisconnect = async (id: number) => {
    if (!confirm('Disconnect this platform?')) return;
    try {
      await fetch(`/api/connections/${id}`, { method: 'DELETE' });
      await loadConnections();
      setTestResult({ success: true, message: 'Platform disconnected' });
    } catch {
      setTestResult({ success: false, message: 'Failed to disconnect' });
    }
  };

  const connectedCount = connections.filter((c: any) => c.hasToken).length;
  const linkedinPlatform = PLATFORMS.find(p => p.key === 'linkedin')!;

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 sm:px-8 pt-5 pb-4 bg-[#0c0e16]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-white flex items-center gap-2">
              <Link2 className="w-5 h-5 text-primary" /> Connections
            </h1>
            <p className="text-[11px] text-white/30 mt-0.5">
              {connectedCount > 0
                ? `${connectedCount} of ${PLATFORMS.length} platforms connected — your agents can post & send`
                : 'Connect your social platforms to enable AI-powered posting'}
            </p>
          </div>
          {connectedCount > 0 && (
            <div className="flex items-center gap-1.5">
              {PLATFORMS.filter(p => connections.find((c: any) => c.platform === p.key)?.hasToken).map(p => (
                <div key={p.key} className="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style={{ background: p.bg }} title={p.name}>
                  {p.emoji}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 sm:px-8 py-5 sm:py-8 max-w-4xl mx-auto space-y-5">

        {/* Quick start banner */}
        {connectedCount === 0 && (
          <QuickStartBanner onStart={() => setSetupPlatform(linkedinPlatform)} />
        )}

        {/* What connections do */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: '📤', title: 'Post Directly', desc: 'Your AI agents post approved content to your social platforms without copy-pasting.' },
            { icon: '🔁', title: 'Automate Campaigns', desc: 'Pipelines that draft + schedule posts across multiple platforms in one run.' },
            { icon: '🛡️', title: 'You Stay in Control', desc: 'All posts need your approval first. Nothing goes live without your sign-off.' },
          ].map(item => (
            <div key={item.title} className="flex gap-3 p-4 rounded-2xl bg-white/3 border border-white/6">
              <span className="text-xl flex-shrink-0">{item.icon}</span>
              <div>
                <p className="text-xs font-semibold text-white/70">{item.title}</p>
                <p className="text-[11px] text-white/35 mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Platform Grid */}
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
                onSetup={() => setSetupPlatform(platform)}
                onOAuth={() => handleOAuth(platform.key)}
                onDisconnect={handleDisconnect}
                onTest={handleTest}
              />
            );
          })}
        </div>

        <p className="text-center text-[10px] text-white/15 pt-2">
          Tokens are stored encrypted. Your agents only use the permissions you grant.
        </p>
      </div>

      {/* Setup Drawer */}
      <AnimatePresence>
        {setupPlatform && (
          <SetupDrawer
            platform={setupPlatform}
            status={platformStatus[setupPlatform.key as keyof ConnectionStatus]}
            baseUrl={baseUrl}
            onClose={() => setSetupPlatform(null)}
            onOAuth={() => handleOAuth(setupPlatform.key)}
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
