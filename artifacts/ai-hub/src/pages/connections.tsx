import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Link2, Key, Trash2, CheckCircle2, RefreshCw, AlertTriangle,
  ExternalLink, Eye, EyeOff, X, ShieldCheck, Zap, ChevronRight,
  Copy, Check, ArrowRight, Info,
} from 'lucide-react';
import { cn } from '@/components/ui-elements';
import { useAppStore } from '@/store';

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
  smtp?: PlatformStatus;
  twilio?: PlatformStatus;
  commhub?: PlatformStatus;
  mailbase?: PlatformStatus;
  [key: string]: PlatformStatus | undefined;
}

interface PlatformField {
  key: string;
  label: string;
  placeholder: string;
  required?: boolean;
  type?: 'text' | 'password' | 'email' | 'number' | 'tel';
  isApiKey?: boolean;
  hint?: string;
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
    authType: 'token' as const,
    envVars: [],
    capabilities: ['Post to Facebook Pages', 'Post to Instagram', 'Run Ads'],
    difficulty: 'Easy',
    timeEstimate: '~3 min',
    quickGuide: {
      title: 'Get your Facebook User Token (3 min)',
      steps: [
        { text: 'Open Graph API Explorer (link below) and sign in with your Facebook account', link: 'https://developers.facebook.com/tools/explorer/' },
        { text: 'In the "Meta App" dropdown (top right) select your app — e.g. "aihub"' },
        { text: 'Keep the second dropdown as "User Token" (not a Page token)' },
        { text: 'IMPORTANT: Click "+ Add a Permission" and add these three: pages_show_list, pages_read_engagement, pages_manage_posts' },
        { text: 'Click "Generate Access Token" → approve all permissions in the popup' },
        { text: 'Copy the token below — we\'ll fetch your pages so you can pick which one this workspace uses' },
      ],
      redirectPath: '',
      tokenGuide: 'Paste your User Token — one token covers ALL your pages. Make sure you added pages_show_list permission before generating it.',
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
  {
    key: 'smtp',
    name: 'SMTP Email',
    subLabel: 'Your Own Domain Email',
    emoji: '✉️',
    color: '#6366f1',
    bg: '#6366f115',
    authType: 'fields' as const,
    envVars: [],
    capabilities: ['Send from your own domain', 'AI drafts & sends emails', 'Works with any provider'],
    difficulty: 'Easy',
    timeEstimate: '~5 min',
    fields: [
      { key: 'fromName', label: 'From Name', placeholder: 'Simao Alves — LES A Inspections', required: true, type: 'text' as const },
      { key: 'fromAddress', label: 'From Email', placeholder: 'hello@lesainspections.com', required: true, type: 'email' as const },
      { key: 'host', label: 'SMTP Host', placeholder: 'mail.yourdomain.com', required: true, type: 'text' as const, hint: 'Common: smtp.gmail.com · smtp.office365.com · mail.zoho.com' },
      { key: 'port', label: 'SMTP Port', placeholder: '587', required: true, type: 'number' as const, hint: '587 (TLS, recommended) · 465 (SSL) · 25 (unencrypted)' },
      { key: 'username', label: 'SMTP Username', placeholder: 'hello@lesainspections.com', required: true, type: 'text' as const },
      { key: 'password', label: 'SMTP Password / App Password', placeholder: '••••••••••••', required: true, type: 'password' as const, isApiKey: true },
    ] as PlatformField[],
    quickGuide: {
      title: 'Connect your own email domain',
      steps: [
        { text: 'Find SMTP settings in your email provider (look for "Outgoing Mail" or "SMTP")' },
        { text: 'Google Workspace / Gmail: enable 2FA → create App Password at myaccount.google.com/apppasswords', link: 'https://myaccount.google.com/apppasswords' },
        { text: 'Zoho / GoDaddy / Namecheap: check your hosting control panel → Email Accounts → SMTP settings' },
        { text: 'Fill in all fields below — your agents will send from YOUR domain, not a shared address' },
      ],
      redirectPath: '',
      tokenGuide: '',
      tokenLink: '',
    },
  },
  {
    key: 'commhub',
    name: 'CommHub SMS',
    subLabel: 'Your SMS Platform',
    emoji: '💬',
    color: '#10b981',
    bg: '#10b98115',
    authType: 'commhub' as const,
    envVars: [],
    capabilities: ['Send SMS from your number', 'WhatsApp support', 'Multi-business routing'],
    difficulty: 'Easy',
    timeEstimate: '~2 min',
    quickGuide: {
      title: 'Connect to CommHub',
      steps: [
        { text: 'Enter your CommHub admin username and password' },
        { text: 'Click "Load My Businesses" — we\'ll fetch your businesses list' },
        { text: 'Pick the business that this workspace should use' },
        { text: 'Click Connect — your API key is fetched automatically (your password is never stored)' },
      ],
      redirectPath: '',
      tokenGuide: '',
      tokenLink: 'https://commhub.replit.app',
    },
  },
  {
    key: 'mailbase',
    name: 'MailBase Email',
    subLabel: 'Your Email Platform',
    emoji: '📨',
    color: '#f59e0b',
    bg: '#f59e0b15',
    authType: 'mailbase' as const,
    envVars: [],
    capabilities: ['Send from your own tenant', 'Transactional emails', 'Contact management'],
    difficulty: 'Easy',
    timeEstimate: '~2 min',
    quickGuide: {
      title: 'Connect to MailBase',
      steps: [
        { text: 'Paste your MailBase API key below (found in MailBase → Settings → API)', link: 'https://mail-base-platform.replit.app' },
        { text: 'Click "Load My Tenants" to see your accounts' },
        { text: 'Pick the tenant and enter the from email/name for this workspace' },
        { text: 'Click Connect — each workspace can use a different tenant or from-address' },
      ],
      redirectPath: '',
      tokenGuide: '',
      tokenLink: 'https://mail-base-platform.replit.app',
    },
  },
  {
    key: 'twilio',
    name: 'Twilio SMS',
    subLabel: 'Direct SMS & WhatsApp',
    emoji: '📱',
    color: '#F22F46',
    bg: '#F22F4615',
    authType: 'fields' as const,
    envVars: [],
    capabilities: ['Send SMS from your number', 'WhatsApp messages', 'Automated follow-ups'],
    difficulty: 'Easy',
    timeEstimate: '~5 min',
    fields: [
      { key: 'accountSid', label: 'Account SID', placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', required: true, type: 'text' as const, hint: 'Starts with "AC" — visible on your Twilio Console dashboard' },
      { key: 'authToken', label: 'Auth Token', placeholder: '••••••••••••••••••••••••••••••••', required: true, type: 'password' as const, isApiKey: true },
      { key: 'phoneNumber', label: 'Twilio Phone Number', placeholder: '+15551234567', required: true, type: 'tel' as const, hint: 'The number you bought in Twilio, in +1XXXXXXXXXX format' },
    ] as PlatformField[],
    quickGuide: {
      title: 'Get your Twilio credentials',
      steps: [
        { text: 'Log into Twilio Console', link: 'https://console.twilio.com/' },
        { text: 'On the dashboard, find your Account SID and Auth Token (click the eye icon to reveal token)' },
        { text: 'Go to Phone Numbers → Manage → Active Numbers → copy your SMS-enabled number' },
        { text: 'Paste all three fields below — done!' },
      ],
      redirectPath: '',
      tokenGuide: 'Your Account SID starts with "AC" and is safe to share. The Auth Token is secret — keep it private.',
      tokenLink: 'https://console.twilio.com/',
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
  onTokenSubmit: (token: string, label: string, metadata?: Record<string, unknown>) => void;
}) {
  const [mode, setMode] = useState<'guide' | 'token'>(platform.authType === 'token' ? 'token' : 'guide');
  const [token, setToken] = useState('');
  const [label, setLabel] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);

  // Meta-specific: page picker
  const [pages, setPages] = useState<Array<{ id: string; name: string; category: string }>>([]);
  const [selectedPage, setSelectedPage] = useState<{ id: string; name: string } | null>(null);
  const [fetchingPages, setFetchingPages] = useState(false);
  const [pageError, setPageError] = useState('');

  // Multi-field platforms (smtp, twilio, etc.)
  const platformFields = (platform as any).fields as PlatformField[] | undefined;
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [showFieldSecrets, setShowFieldSecrets] = useState<Record<string, boolean>>({});
  const allFieldsFilled = platformFields
    ? platformFields.filter(f => f.required).every(f => (fieldValues[f.key] || '').trim())
    : true;

  // CommHub: admin creds → business picker (admin password NEVER stored)
  const [chUser, setChUser] = useState('');
  const [chPass, setChPass] = useState('');
  const [chPassVisible, setChPassVisible] = useState(false);
  const [chBusinesses, setChBusinesses] = useState<Array<{ id: number; name: string; phone_number: string | null; carrier: string }>>([]);
  const [chSelected, setChSelected] = useState<{ id: number; name: string } | null>(null);
  const [chLoading, setChLoading] = useState(false);
  const [chConnecting, setChConnecting] = useState(false);
  const [chError, setChError] = useState('');

  // MailBase: API key → tenant picker + from fields
  const [mbKey, setMbKey] = useState('');
  const [mbKeyVisible, setMbKeyVisible] = useState(false);
  const [mbTenants, setMbTenants] = useState<Array<{ id: number; name: string; slug?: string }>>([]);
  const [mbSelected, setMbSelected] = useState<{ id: number; name: string } | null>(null);
  const [mbFromEmail, setMbFromEmail] = useState('');
  const [mbFromName, setMbFromName] = useState('');
  const [mbLoading, setMbLoading] = useState(false);
  const [mbError, setMbError] = useState('');

  const handleLoadChBusinesses = async () => {
    if (!chUser.trim() || !chPass.trim()) return;
    setChLoading(true); setChError(''); setChBusinesses([]); setChSelected(null);
    try {
      const res = await fetch('/api/connections/proxy/commhub/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUser: chUser, adminPass: chPass }),
      });
      const data = await res.json() as any;
      if (!res.ok) { setChError(data.error || 'Invalid credentials'); return; }
      if (!data.length) { setChError('No businesses found in CommHub'); return; }
      setChBusinesses(data);
      setChSelected({ id: data[0].id, name: data[0].name });
    } catch { setChError('Could not reach CommHub — check your network'); }
    finally { setChLoading(false); }
  };

  const handleLoadMbTenants = async () => {
    if (!mbKey.trim()) return;
    setMbLoading(true); setMbError(''); setMbTenants([]); setMbSelected(null);
    try {
      const res = await fetch('/api/connections/proxy/mailbase/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: mbKey }),
      });
      const data = await res.json() as any;
      if (!res.ok) { setMbError(data.error || 'Invalid API key'); return; }
      const list = Array.isArray(data) ? data : (data.tenants || data.data || []);
      if (!list.length) { setMbError('No tenants found — make sure the API key is correct'); return; }
      setMbTenants(list);
      setMbSelected({ id: list[0].id, name: list[0].name });
    } catch { setMbError('Could not reach MailBase — check your network'); }
    finally { setMbLoading(false); }
  };

  const redirectUri = baseUrl ? `${baseUrl}${platform.quickGuide.redirectPath}` : `https://your-app.replit.app${platform.quickGuide.redirectPath}`;
  const oauthReady = status?.configured ?? false;

  const handleFetchPages = async () => {
    if (!token.trim()) return;
    setFetchingPages(true);
    setPageError('');
    setPages([]);
    setSelectedPage(null);
    try {
      // Route through our server — it exchanges the short-lived token for a
      // long-lived one (using META_APP_ID + META_APP_SECRET) so the stored
      // page access token is permanent and never expires.
      const res = await fetch('/api/connections/meta/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userToken: token.trim() }),
      });
      const data = await res.json() as any;

      if (!res.ok) {
        setPageError(data.error || 'Failed to load pages — check your token and try again');
        return;
      }

      // Update the token field with the long-lived version (60 days)
      if (data.longLivedToken && data.longLivedToken !== token.trim()) {
        setToken(data.longLivedToken);
      }

      setPages(data.pages || []);
      if (data.pages?.length) setSelectedPage(data.pages[0]);
    } catch {
      setPageError('Failed to reach server — please try again');
    } finally {
      setFetchingPages(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    if (platform.authType === 'commhub' && chSelected) {
      setChConnecting(true);
      try {
        const res = await fetch('/api/connections/proxy/commhub/apikey', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminUser: chUser, adminPass: chPass, businessId: chSelected.id }),
        });
        const data = await res.json() as any;
        if (!res.ok) { setChError(data.error || 'Failed to fetch API key'); setSaving(false); setChConnecting(false); return; }
        await onTokenSubmit(data.apiKey, label.trim() || chSelected.name, { businessId: chSelected.id, businessName: chSelected.name });
      } catch { setChError('Connection failed — please try again'); }
      finally { setChConnecting(false); }
    } else if (platform.authType === 'mailbase' && mbKey.trim() && mbFromEmail.trim()) {
      const lbl = label.trim() || mbFromEmail;
      await onTokenSubmit(mbKey.trim(), lbl, {
        tenantId: mbSelected?.id,
        tenantName: mbSelected?.name,
        fromEmail: mbFromEmail.trim(),
        fromName: mbFromName.trim() || lbl,
      });
    } else if (platform.authType === 'fields' && platformFields) {
      const apiKeyField = platformFields.find(f => f.isApiKey);
      const apiKey = apiKeyField ? (fieldValues[apiKeyField.key] || '').trim() : '';
      const metadata: Record<string, unknown> = {};
      platformFields.forEach(f => {
        if (!f.isApiKey) metadata[f.key] = (fieldValues[f.key] || '').trim();
      });
      const defaultLabel = platform.key === 'smtp'
        ? (fieldValues['fromAddress'] || platform.name)
        : platform.key === 'twilio'
          ? (fieldValues['phoneNumber'] || platform.name)
          : platform.name;
      await onTokenSubmit(apiKey, label.trim() || defaultLabel, metadata);
    } else {
      if (!token.trim()) { setSaving(false); return; }
      const metadata = platform.key === 'meta' && selectedPage
        ? { pageId: selectedPage.id, pageName: selectedPage.name, pageAccessToken: (selectedPage as any).access_token }
        : undefined;
      const lbl = label.trim() || (selectedPage ? selectedPage.name : platform.name);
      await onTokenSubmit(token.trim(), lbl, metadata);
    }
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

          {/* ── COMMHUB MODE ── */}
          {platform.authType === 'commhub' && (
            <>
              <div>
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">{platform.quickGuide.title}</p>
                <div className="space-y-2">
                  {platform.quickGuide.steps.map((step, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                      <p className="text-sm text-white/65 leading-relaxed">{step.text}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-white/40 mb-1.5 block">Username <span className="text-red-400">*</span></label>
                    <input value={chUser} onChange={e => { setChUser(e.target.value); setChBusinesses([]); }} placeholder="admin"
                      className="w-full bg-white/4 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40" />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 mb-1.5 block">Password <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <input type={chPassVisible ? 'text' : 'password'} value={chPass} onChange={e => { setChPass(e.target.value); setChBusinesses([]); }} placeholder="••••••••"
                        className="w-full bg-white/4 border border-white/8 rounded-xl px-3 pr-9 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40" />
                      <button onClick={() => setChPassVisible(s => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50">
                        {chPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
                {chBusinesses.length === 0 && (
                  <div>
                    <button onClick={handleLoadChBusinesses} disabled={chLoading || !chUser.trim() || !chPass.trim()}
                      className="w-full py-2.5 rounded-xl border border-[#10b981]/30 bg-[#10b981]/10 hover:bg-[#10b981]/20 text-[#10b981] text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                      {chLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>💬</span>}
                      {chLoading ? 'Loading businesses…' : 'Load My Businesses'}
                    </button>
                    {chError && <p className="text-[11px] text-red-400 mt-1.5">{chError}</p>}
                  </div>
                )}
                {chBusinesses.length > 0 && (
                  <div>
                    <label className="text-xs text-white/40 mb-2 block">Which business should this workspace use? <span className="text-red-400">*</span></label>
                    <div className="space-y-1.5">
                      {chBusinesses.map(biz => (
                        <button key={biz.id} onClick={() => setChSelected({ id: biz.id, name: biz.name })}
                          className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left",
                            chSelected?.id === biz.id ? "border-[#10b981]/40 bg-[#10b981]/12 text-white" : "border-white/8 bg-white/3 text-white/60 hover:bg-white/6")}>
                          <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                            chSelected?.id === biz.id ? "border-[#10b981] bg-[#10b981]" : "border-white/20")}>
                            {chSelected?.id === biz.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{biz.name}</p>
                            <p className="text-[10px] text-white/30 truncate">{biz.phone_number || biz.carrier || 'No phone set'}</p>
                          </div>
                          {chSelected?.id === biz.id && <CheckCircle2 className="w-4 h-4 text-[#10b981] flex-shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-xs text-white/40 mb-1.5 block">Label <span className="text-white/20">(optional)</span></label>
                  <input value={label} onChange={e => setLabel(e.target.value)} placeholder={chSelected?.name || 'e.g. Equifind Recovery SMS'}
                    className="w-full bg-white/4 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40" />
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/15 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-white/50">Your admin password is used only to fetch the API key and is <strong className="text-white/70">never stored</strong>.</p>
                </div>
                <button onClick={handleSave} disabled={saving || !chSelected}
                  className="w-full py-3 rounded-xl disabled:opacity-35 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
                  style={{ background: chSelected ? '#10b981' : undefined, backgroundColor: !chSelected ? 'rgba(255,255,255,0.05)' : undefined }}>
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                  {saving ? 'Connecting…' : chSelected ? `Connect ${chSelected.name}` : 'Load businesses first'}
                </button>
              </div>
            </>
          )}

          {/* ── MAILBASE MODE ── */}
          {platform.authType === 'mailbase' && (
            <>
              <div>
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">{platform.quickGuide.title}</p>
                <div className="space-y-2">
                  {platform.quickGuide.steps.map((step, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                      <div className="flex-1">
                        <p className="text-sm text-white/65 leading-relaxed">{step.text}</p>
                        {step.link && <a href={step.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-primary/70 hover:text-primary mt-0.5"><ExternalLink className="w-3 h-3" /> Open link</a>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-white/40 mb-1.5 block">MailBase API Key <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <input type={mbKeyVisible ? 'text' : 'password'} value={mbKey} onChange={e => { setMbKey(e.target.value); setMbTenants([]); setMbSelected(null); }} placeholder="mb_..."
                      className="w-full bg-white/4 border border-white/8 rounded-xl px-3 pr-10 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40 font-mono" />
                    <button onClick={() => setMbKeyVisible(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50">
                      {mbKeyVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {mbKey.trim() && mbTenants.length === 0 && (
                  <div>
                    <button onClick={handleLoadMbTenants} disabled={mbLoading}
                      className="w-full py-2.5 rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/10 hover:bg-[#f59e0b]/20 text-[#f59e0b] text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                      {mbLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>📨</span>}
                      {mbLoading ? 'Loading tenants…' : 'Load My Tenants'}
                    </button>
                    {mbError && <p className="text-[11px] text-red-400 mt-1.5">{mbError}</p>}
                  </div>
                )}
                {mbTenants.length > 0 && (
                  <div>
                    <label className="text-xs text-white/40 mb-2 block">Which tenant does this workspace belong to?</label>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {mbTenants.map(t => (
                        <button key={t.id} onClick={() => setMbSelected({ id: t.id, name: t.name })}
                          className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left",
                            mbSelected?.id === t.id ? "border-[#f59e0b]/40 bg-[#f59e0b]/12 text-white" : "border-white/8 bg-white/3 text-white/60 hover:bg-white/6")}>
                          <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                            mbSelected?.id === t.id ? "border-[#f59e0b] bg-[#f59e0b]" : "border-white/20")}>
                            {mbSelected?.id === t.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{t.name}</p>
                            {t.slug && <p className="text-[10px] text-white/30">{t.slug}</p>}
                          </div>
                          {mbSelected?.id === t.id && <CheckCircle2 className="w-4 h-4 text-[#f59e0b] flex-shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {(mbTenants.length > 0 || !mbKey.trim()) && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-white/40 mb-1.5 block">From Name <span className="text-red-400">*</span></label>
                        <input value={mbFromName} onChange={e => setMbFromName(e.target.value)} placeholder="Simao — LES A"
                          className="w-full bg-white/4 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40" />
                      </div>
                      <div>
                        <label className="text-xs text-white/40 mb-1.5 block">From Email <span className="text-red-400">*</span></label>
                        <input type="email" value={mbFromEmail} onChange={e => setMbFromEmail(e.target.value)} placeholder="hello@lesainspections.com"
                          className="w-full bg-white/4 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-white/40 mb-1.5 block">Label <span className="text-white/20">(optional)</span></label>
                      <input value={label} onChange={e => setLabel(e.target.value)} placeholder={mbFromEmail || 'e.g. LESA Inspections Email'}
                        className="w-full bg-white/4 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40" />
                    </div>
                    <button onClick={handleSave} disabled={saving || !mbKey.trim() || !mbFromEmail.trim()}
                      className="w-full py-3 rounded-xl disabled:opacity-35 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
                      style={{ background: mbKey.trim() && mbFromEmail.trim() ? '#f59e0b' : undefined, backgroundColor: !(mbKey.trim() && mbFromEmail.trim()) ? 'rgba(255,255,255,0.05)' : undefined }}>
                      {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                      {saving ? 'Connecting…' : 'Connect MailBase'}
                    </button>
                  </>
                )}
              </div>
            </>
          )}

          {/* ── FIELDS MODE (SMTP, Twilio, etc.) ── */}
          {platform.authType === 'fields' && platformFields && (
            <>
              {/* Steps guide */}
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

              {/* Dynamic field inputs */}
              <div className="space-y-3">
                {platformFields.map(field => {
                  const isSecret = field.type === 'password';
                  const revealed = showFieldSecrets[field.key];
                  return (
                    <div key={field.key}>
                      <label className="text-xs text-white/40 mb-1.5 flex items-center gap-1">
                        {field.label}
                        {field.required && <span className="text-red-400">*</span>}
                      </label>
                      <div className="relative">
                        <input
                          type={isSecret && !revealed ? 'password' : field.type === 'number' ? 'number' : 'text'}
                          value={fieldValues[field.key] || ''}
                          onChange={e => setFieldValues(v => ({ ...v, [field.key]: e.target.value }))}
                          placeholder={field.placeholder}
                          className="w-full bg-white/4 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40 transition-all pr-10"
                        />
                        {isSecret && (
                          <button
                            onClick={() => setShowFieldSecrets(s => ({ ...s, [field.key]: !s[field.key] }))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-all"
                          >
                            {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                      {field.hint && <p className="text-[10px] text-white/25 mt-1 leading-relaxed">{field.hint}</p>}
                    </div>
                  );
                })}

                {/* Optional label override */}
                <div>
                  <label className="text-xs text-white/40 mb-1.5 block">Account Label <span className="text-white/20">(optional)</span></label>
                  <input
                    value={label}
                    onChange={e => setLabel(e.target.value)}
                    placeholder={platform.key === 'smtp' ? fieldValues['fromAddress'] || 'e.g. hello@lesainspections.com' : fieldValues['phoneNumber'] || `e.g. ${platform.name}`}
                    className="w-full bg-white/4 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40 transition-all"
                  />
                </div>

                <button
                  onClick={handleSave}
                  disabled={saving || !allFieldsFilled}
                  className="w-full py-3 rounded-xl disabled:opacity-35 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
                  style={{ background: allFieldsFilled ? platform.color : undefined, backgroundColor: !allFieldsFilled ? 'rgba(255,255,255,0.05)' : undefined }}
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                  {saving ? 'Connecting…' : `Connect ${platform.name}`}
                </button>
              </div>
            </>
          )}

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
                  <label className="text-xs text-white/40 mb-1.5 block">
                    Access Token <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showToken ? 'text' : 'password'}
                      value={token}
                      onChange={e => { setToken(e.target.value); setPages([]); setSelectedPage(null); setPageError(''); }}
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

                {/* Meta: Load Pages button & picker */}
                {platform.key === 'meta' && token.trim() && pages.length === 0 && (
                  <div>
                    <button
                      onClick={handleFetchPages}
                      disabled={fetchingPages}
                      className="w-full py-2.5 rounded-xl border border-[#1877F2]/30 bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-[#1877F2] text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {fetchingPages ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>📘</span>}
                      {fetchingPages ? 'Loading your pages…' : 'Load My Facebook Pages'}
                    </button>
                    {pageError && (
                      <div className="mt-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                        {pageError.split('\n').map((line, i) => (
                          <p key={i} className="text-[11px] text-red-400 leading-relaxed">{line}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Meta: Page list picker */}
                {platform.key === 'meta' && pages.length > 0 && (
                  <div>
                    <label className="text-xs text-white/40 mb-2 block">
                      Which Facebook Page should this workspace post to? <span className="text-red-400">*</span>
                    </label>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {pages.map(page => (
                        <button
                          key={page.id}
                          onClick={() => setSelectedPage(page)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left",
                            selectedPage?.id === page.id
                              ? "border-[#1877F2]/40 bg-[#1877F2]/12 text-white"
                              : "border-white/8 bg-white/3 text-white/60 hover:bg-white/6"
                          )}
                        >
                          <div className={cn(
                            "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                            selectedPage?.id === page.id ? "border-[#1877F2] bg-[#1877F2]" : "border-white/20"
                          )}>
                            {selectedPage?.id === page.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{page.name}</p>
                            {page.category && <p className="text-[10px] text-white/30 truncate">{page.category}</p>}
                          </div>
                          {selectedPage?.id === page.id && <CheckCircle2 className="w-4 h-4 text-[#1877F2] flex-shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs text-white/40 mb-1.5 block">Account Label <span className="text-white/20">(optional — defaults to page name)</span></label>
                  <input
                    value={label}
                    onChange={e => setLabel(e.target.value)}
                    placeholder={selectedPage ? selectedPage.name : `e.g. Simao — ${platform.name}`}
                    className="w-full bg-white/4 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40 transition-all"
                  />
                </div>

                <button
                  onClick={handleSave}
                  disabled={saving || !token.trim() || (platform.key === 'meta' && pages.length > 0 && !selectedPage)}
                  className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-35 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                  {saving ? 'Saving…' : selectedPage ? `Connect as ${selectedPage.name}` : 'Save & Connect'}
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
  platform, connections, status,
  onSetup, onDisconnect, onTest, onOAuth,
}: {
  platform: typeof PLATFORMS[0];
  connections: any[];  // all connections for this platform
  status?: PlatformStatus;
  onSetup: () => void;
  onDisconnect: (id: number) => void;
  onTest: (id: number) => void;
  onOAuth: () => void;
}) {
  const isOAuth = platform.authType === 'oauth';
  const oauthReady = isOAuth ? (status?.configured ?? false) : true;
  const hasAny = connections.length > 0;

  return (
    <motion.div
      layout
      className={cn(
        "relative rounded-2xl border overflow-hidden transition-all",
        hasAny ? "border-emerald-500/25 bg-[#0f1119]" : "border-white/6 bg-[#0f1119] hover:border-white/12"
      )}
    >
      {/* Color accent top bar */}
      <div className="h-0.5 w-full" style={{ background: hasAny ? '#10b981' : `${platform.color}40` }} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: platform.bg }}>
            {platform.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-white text-sm">{platform.name}</p>
              {hasAny ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/12 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                  <CheckCircle2 className="w-2.5 h-2.5" /> {connections.length} connected
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
            <p className="text-[11px] text-white/30 mt-0.5">{platform.subLabel}</p>
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

        {/* Connected accounts list */}
        {hasAny && (
          <div className="space-y-2 mb-3">
            {connections.map(conn => (
              <div key={conn.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span className="flex-1 text-xs text-white/70 truncate">{conn.accountLabel || platform.name}</span>
                <button
                  onClick={() => onTest(conn.id)}
                  className="text-white/25 hover:text-white/60 transition-all"
                  title="Test connection"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
                <button
                  onClick={() => onDisconnect(conn.id)}
                  className="text-red-400/40 hover:text-red-400 transition-all"
                  title="Disconnect"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Connect / Add button */}
        <button
          onClick={isOAuth && oauthReady ? onOAuth : onSetup}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all border"
          style={{
            background: `${platform.color}12`,
            borderColor: `${platform.color}28`,
            color: hasAny ? 'rgba(255,255,255,0.45)' : platform.color,
          }}
        >
          {hasAny ? (
            <><Key className="w-3.5 h-3.5" /> Add Another {platform.name === 'Meta' ? 'Page' : 'Account'}</>
          ) : isOAuth && oauthReady ? (
            <><ShieldCheck className="w-3.5 h-3.5" /> Connect with OAuth</>
          ) : isOAuth && !oauthReady ? (
            <><Key className="w-3.5 h-3.5" /> View Setup Guide</>
          ) : (
            <><Key className="w-3.5 h-3.5" /> Connect with Token</>
          )}
          <ChevronRight className="w-3.5 h-3.5 ml-auto" />
        </button>
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
  const account = useAppStore(s => s.account);
  const ws = account?.workspace ?? 'general';
  const wsHeaders = { 'X-Workspace': ws };

  const loadConnections = useCallback(async () => {
    try {
      const res = await fetch('/api/connections', { headers: wsHeaders });
      if (res.ok) setConnections(await res.json());
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws]);

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
      const res = await fetch(`/api/connections/oauth/${platformKey}/initiate`, { headers: wsHeaders });
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

  const handleTokenSave = async (platformKey: string, token: string, label: string, metadata?: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...wsHeaders },
        body: JSON.stringify({ platform: platformKey, apiKey: token, accountLabel: label, metadata }),
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
      const res = await fetch(`/api/connections/${id}/test`, { method: 'POST', headers: wsHeaders });
      const data = await res.json();
      setTestResult({ success: data?.success ?? true, message: data?.message ?? 'Connection tested' });
    } catch {
      setTestResult({ success: false, message: 'Test failed' });
    }
  };

  const handleDisconnect = async (id: number) => {
    if (!confirm('Disconnect this platform?')) return;
    try {
      await fetch(`/api/connections/${id}`, { method: 'DELETE', headers: wsHeaders });
      await loadConnections();
      setTestResult({ success: true, message: 'Platform disconnected' });
    } catch {
      setTestResult({ success: false, message: 'Failed to disconnect' });
    }
  };

  const connectedCount = PLATFORMS.filter(p => connections.some((c: any) => c.platform === p.key && c.hasToken)).length;
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
              {PLATFORMS.filter(p => connections.some((c: any) => c.platform === p.key && c.hasToken)).map(p => (
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
            const platformConns = connections.filter((c: any) => c.platform === platform.key && c.hasToken);
            const status = platformStatus[platform.key as keyof ConnectionStatus];
            return (
              <PlatformCard
                key={platform.key}
                platform={platform}
                connections={platformConns}
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
            onTokenSubmit={(token, label, metadata) => handleTokenSave(setupPlatform.key, token, label, metadata)}
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
