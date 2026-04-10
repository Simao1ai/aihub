import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Share2, Sparkles, Send, Check, X, Edit3, Trash2,
  Clock, ChevronDown, RefreshCw, AlertCircle, BarChart2,
  ThumbsUp, Eye, Repeat2, MessageCircle, TrendingUp, Plus, Bot, Calendar, Copy, ExternalLink
} from 'lucide-react';
import { useAppStore } from '@/store';
import { cn } from '@/components/ui-elements';

// ── Types ────────────────────────────────────────────────────────────────

interface SocialPost {
  id: number;
  platform: string;
  content: string;
  status: string;
  aiGenerated: boolean;
  agentSlug: string | null;
  connectionId: number | null;
  businessTag: string;
  topic: string | null;
  scheduledAt: string | null;
  postedAt: string | null;
  errorMessage: string | null;
  imageUrl: string | null;
  imagePrompt: string | null;
  platformPostId: string | null;
  publishedUrl: string | null;
  createdAt: string;
}

interface Connection {
  id: number;
  platform: string;
  displayName: string;
  accountLabel: string;
  isConnected: boolean;
  hasToken: boolean;
}

// ── Platform config ──────────────────────────────────────────────────────

const PLATFORMS: Record<string, { label: string; color: string; bg: string; maxChars?: number; icon: string }> = {
  linkedin: { label: 'LinkedIn',  color: '#0a66c2', bg: '#0a66c215', icon: '💼', maxChars: 3000 },
  twitter:  { label: 'Twitter/X', color: '#000000', bg: '#00000015', icon: '𝕏',  maxChars: 280  },
  meta:     { label: 'Facebook',  color: '#1877f2', bg: '#1877f215', icon: 'f',   maxChars: 2000 },
};

const TONES = ['Professional', 'Casual', 'Inspirational', 'Educational', 'Promotional', 'Storytelling'];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft:            { label: 'Draft',           color: '#6b7280', bg: '#6b728015' },
  pending_approval: { label: 'Needs Approval',  color: '#f59e0b', bg: '#f59e0b15' },
  approved:         { label: 'Approved',         color: '#10b981', bg: '#10b98115' },
  scheduled:        { label: 'Scheduled',        color: '#8b5cf6', bg: '#8b5cf615' },
  posted:           { label: 'Posted',           color: '#3b82f6', bg: '#3b82f615' },
  failed:           { label: 'Failed',           color: '#ef4444', bg: '#ef444415' },
};

// ── Platform badge ────────────────────────────────────────────────────────

function PlatformBadge({ platform, size = 'sm' }: { platform: string; size?: 'sm' | 'lg' }) {
  const cfg = PLATFORMS[platform] ?? { label: platform, color: '#6b7280', bg: '#6b728015', icon: '📱' };
  return (
    <span
      className={cn("inline-flex items-center gap-1 font-semibold rounded-lg", size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1')}
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <span>{cfg.icon}</span> {cfg.label}
    </span>
  );
}

// ── Post card for queue / history ────────────────────────────────────────

function PostCard({
  post,
  connections,
  onApprove,
  onPostNow,
  onDelete,
  onEdit,
  onPostUpdated,
  showActions = true,
}: {
  post: SocialPost;
  connections: Connection[];
  onApprove: (post: SocialPost) => void;
  onPostNow: (post: SocialPost, connectionId: number) => void;
  onDelete: (post: SocialPost) => void;
  onEdit: (post: SocialPost) => void;
  onPostUpdated?: (post: SocialPost) => void;
  showActions?: boolean;
}) {
  const { addNotification } = useAppStore();
  const [selectedConn, setSelectedConn] = useState<number | null>(post.connectionId);
  const [posting, setPosting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [localImageUrl, setLocalImageUrl] = useState<string | null>(post.imageUrl);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerateImage = async () => {
    if (!post.imagePrompt) return;
    setGeneratingImage(true);
    try {
      const res = await fetch(`/api/social-posts/${post.id}/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagePrompt: post.imagePrompt }),
      });
      const data = await res.json();
      if (data.imageUrl) {
        setLocalImageUrl(data.imageUrl);
        if (onPostUpdated) onPostUpdated(data.post);
      }
    } catch (err) {
      console.error('Image generation failed:', err);
    } finally {
      setGeneratingImage(false);
    }
  };

  const platformConns = connections.filter(c => c.platform === post.platform && c.hasToken && c.isConnected);
  const status = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.draft;
  const plt = PLATFORMS[post.platform];

  const handlePostNow = async () => {
    if (!selectedConn) return;
    setPosting(true);
    await onPostNow(post, selectedConn);
    setPosting(false);
  };

  const handleSchedule = async () => {
    if (!scheduleDate || !selectedConn) return;
    setScheduling(true);
    try {
      const res = await fetch(`/api/social-posts/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'approved',
          scheduledAt: new Date(scheduleDate).toISOString(),
          connectionId: selectedConn,
        }),
      });
      const updated = await res.json();
      if (onPostUpdated) onPostUpdated(updated);
      setShowSchedule(false);
      addNotification({
        type: 'socialPost',
        icon: '📅',
        title: 'Post Scheduled',
        body: `Your ${PLATFORMS[post.platform]?.label ?? post.platform} post is scheduled for ${format(new Date(scheduleDate), 'MMM d, h:mm a')}.`,
        action: { label: 'View queue', href: '/social' },
      });
    } catch (err) {
      console.error('Scheduling failed:', err);
    } finally {
      setScheduling(false);
    }
  };

  const handleCopyContent = () => {
    navigator.clipboard.writeText(post.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="bg-[#111520] border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-all"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <PlatformBadge platform={post.platform} />
          {post.aiGenerated && (
            <span className="inline-flex items-center gap-1 text-[10px] text-violet-400 bg-violet-400/10 px-2 py-0.5 rounded-full font-medium">
              <Bot className="w-2.5 h-2.5" /> AI
            </span>
          )}
          {post.topic && (
            <span className="text-[10px] text-white/30 truncate max-w-32">re: {post.topic}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded-md font-medium" style={{ background: status.bg, color: status.color }}>
            {status.label}
          </span>
          {post.scheduledAt && post.status === 'approved' && !post.postedAt && (
            <span className="text-[10px] text-violet-400 flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5" />
              {format(new Date(post.scheduledAt), 'MMM d, h:mm a')}
            </span>
          )}
          <span className="text-[10px] text-white/20">{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
        </div>
      </div>

      {/* Content preview */}
      <div className="px-4 py-3 group/content relative">
        <p className="text-sm text-white/75 leading-relaxed whitespace-pre-wrap line-clamp-5">
          {post.content || <span className="italic text-white/20">Empty draft</span>}
        </p>
        <div className="mt-2 flex items-center justify-between">
          {plt?.maxChars ? (
            <span className={cn("text-[10px]", post.content.length > plt.maxChars ? 'text-red-400' : 'text-white/20')}>
              {post.content.length}/{plt.maxChars}
            </span>
          ) : <span />}
          {post.content && (
            <button
              onClick={handleCopyContent}
              className="flex items-center gap-1 text-[10px] text-white/25 hover:text-white/60 transition-all opacity-0 group-hover/content:opacity-100"
            >
              {copied ? (
                <><Check className="w-2.5 h-2.5 text-emerald-400" /><span className="text-emerald-400">Copied!</span></>
              ) : (
                <><Copy className="w-2.5 h-2.5" />Copy text</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Generated image */}
      {localImageUrl && (
        <div className="px-4 pb-3">
          <div className="rounded-xl overflow-hidden border border-white/8 bg-white/3">
            <img
              src={localImageUrl}
              alt="AI-generated visual for post"
              className="w-full object-cover max-h-72"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
          <p className="text-[10px] text-white/25 mt-1.5 flex items-center gap-1">
            <span>🎨</span> PIXEL-generated visual
          </p>
        </div>
      )}

      {/* Generate image button — shown when PIXEL wrote a prompt but image not generated yet */}
      {!localImageUrl && post.imagePrompt && showActions && (
        <div className="px-4 pb-3">
          <button
            onClick={handleGenerateImage}
            disabled={generatingImage}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-fuchsia-500/30 text-fuchsia-400 hover:bg-fuchsia-500/8 text-xs font-medium transition-all disabled:opacity-50"
          >
            {generatingImage ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Generating image…
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Generate PIXEL Image
              </>
            )}
          </button>
          <p className="text-[10px] text-white/20 mt-1 text-center">PIXEL wrote a prompt — click to generate the actual image</p>
        </div>
      )}

      {/* Error message */}
      {post.errorMessage && (
        <div className="mx-4 mb-3 flex items-start gap-2 text-xs text-red-400 bg-red-400/8 border border-red-400/15 rounded-xl px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          {post.errorMessage}
        </div>
      )}

      {/* Posted at + View post link */}
      {post.postedAt && (
        <div className="px-4 pb-3 text-[11px] text-white/25 flex items-center gap-2.5 flex-wrap">
          <span className="flex items-center gap-1">
            <Check className="w-3 h-3 text-emerald-400" />
            Posted {format(new Date(post.postedAt), 'MMM d, h:mm a')}
          </span>
          {post.publishedUrl && (
            <a
              href={post.publishedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:text-primary/80 font-medium transition-colors"
            >
              <ExternalLink className="w-2.5 h-2.5" />
              View on {PLATFORMS[post.platform]?.label ?? post.platform}
            </a>
          )}
        </div>
      )}

      {/* Actions */}
      {showActions && post.status !== 'posted' && (
        <>
        <div className="px-4 pb-4 flex items-center gap-2">
          {/* Connection selector */}
          {platformConns.length > 0 ? (
            <div className="relative flex-1">
              <select
                value={selectedConn ?? ''}
                onChange={e => setSelectedConn(Number(e.target.value) || null)}
                className="w-full appearance-none bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-xs text-white/60 focus:outline-none pr-7"
              >
                <option value="">Select account...</option>
                {platformConns.map(c => {
                  const meta = c.metadata as Record<string, unknown> | null;
                  const display = (meta?.pageName as string) || (meta?.businessName as string) || c.accountLabel || c.displayName || c.platform;
                  return <option key={c.id} value={c.id}>{display}</option>;
                })}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30 pointer-events-none" />
            </div>
          ) : (
            <div className="flex-1 text-[11px] text-white/25 flex items-center gap-1.5">
              <AlertCircle className="w-3 h-3" /> No {plt?.label ?? post.platform} account connected
            </div>
          )}

          {/* Action buttons */}
          <button onClick={() => onEdit(post)} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all" title="Edit">
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          {post.status === 'pending_approval' && (
            <button onClick={() => onApprove(post)} className="px-3 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 text-xs font-semibold flex items-center gap-1 transition-all">
              <ThumbsUp className="w-3 h-3" /> Approve
            </button>
          )}
          <button
            onClick={handlePostNow}
            disabled={!selectedConn || posting || platformConns.length === 0}
            className="px-3 h-8 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all disabled:opacity-30"
            style={{ background: plt?.color ?? '#6366f1', color: 'white' }}
          >
            {posting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            Post
          </button>
          <button
            onClick={() => setShowSchedule(v => !v)}
            disabled={platformConns.length === 0}
            className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center text-xs transition-all disabled:opacity-30",
              showSchedule ? "bg-violet-500/20 text-violet-400" : "bg-white/5 hover:bg-white/10 text-white/40 hover:text-violet-400"
            )}
            title="Schedule this post"
          >
            <Calendar className="w-3.5 h-3.5" />
          </button>
          {confirmDelete ? (
            <div className="flex gap-1">
              <button onClick={() => onDelete(post)} className="w-8 h-8 rounded-xl bg-red-500/15 text-red-400 flex items-center justify-center hover:bg-red-500/25">
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setConfirmDelete(false)} className="w-8 h-8 rounded-xl bg-white/5 text-white/40 flex items-center justify-center hover:bg-white/10">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-red-500/10 flex items-center justify-center text-white/20 hover:text-red-400 transition-all">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Inline schedule picker */}
        <AnimatePresence>
          {showSchedule && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 p-3 rounded-xl bg-violet-500/8 border border-violet-500/20 flex items-center gap-2"
            >
              <Calendar className="w-3.5 h-3.5 text-violet-400 shrink-0" />
              <input
                type="datetime-local"
                value={scheduleDate}
                onChange={e => setScheduleDate(e.target.value)}
                min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                className="flex-1 bg-transparent text-xs text-white focus:outline-none [color-scheme:dark]"
              />
              <button
                onClick={handleSchedule}
                disabled={!scheduleDate || !selectedConn || scheduling}
                className="px-3 py-1.5 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 text-xs font-semibold disabled:opacity-40 transition-all flex items-center gap-1"
              >
                {scheduling ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                Schedule
              </button>
              <button onClick={() => setShowSchedule(false)} className="text-white/25 hover:text-white/50">
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}

// ── Composer ─────────────────────────────────────────────────────────────

function Composer({
  connections,
  businessTag,
  onPostCreated,
}: {
  connections: Connection[];
  businessTag: string;
  onPostCreated: (post: SocialPost) => void;
}) {
  const [platform, setPlatform] = useState<string>('linkedin');
  const [topic, setTopic] = useState('');
  const [content, setContent] = useState('');
  const [tone, setTone] = useState('Professional');
  const [selectedConn, setSelectedConn] = useState<number | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [posting, setPosting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [charCount, setCharCount] = useState(0);

  useEffect(() => { setCharCount(content.length); }, [content]);

  const plt = PLATFORMS[platform];
  const platformConns = connections.filter(c => c.platform === platform && c.hasToken && c.isConnected);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleAIDraft = async () => {
    if (!topic.trim()) { showToast('Enter a topic first', 'error'); return; }
    setDrafting(true);
    try {
      const res = await fetch('/api/social-posts/ai-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, topic, businessTag, tone }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      const post: SocialPost = await res.json();
      setContent(post.content);
      onPostCreated(post);
      showToast('SOSHI drafted your post! Edit and publish when ready.');
    } catch (e: any) {
      showToast(e.message || 'AI draft failed', 'error');
    } finally {
      setDrafting(false);
    }
  };

  const handleSaveForApproval = async () => {
    if (!content.trim()) { showToast('Write some content first', 'error'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/social-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, content, connectionId: selectedConn, businessTag, topic, status: 'pending_approval', aiGenerated: false }),
      });
      if (!res.ok) throw new Error();
      const post: SocialPost = await res.json();
      onPostCreated(post);
      setContent('');
      setTopic('');
      showToast('Saved to approval queue!');
    } catch {
      showToast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePostNow = async () => {
    if (!content.trim()) { showToast('Write some content first', 'error'); return; }
    if (!selectedConn) { showToast('Select a connected account first', 'error'); return; }
    setPosting(true);
    try {
      // Create then post immediately
      const createRes = await fetch('/api/social-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, content, connectionId: selectedConn, businessTag, topic, status: 'approved', aiGenerated: false }),
      });
      if (!createRes.ok) throw new Error();
      const post: SocialPost = await createRes.json();

      const postRes = await fetch(`/api/social-posts/${post.id}/post-now`, { method: 'POST' });
      const result = await postRes.json();
      onPostCreated(result.post ?? post);
      if (result.success) {
        setContent('');
        setTopic('');
        showToast(`Posted to ${plt?.label}! 🎉`);
      } else {
        showToast(result.errorMessage ?? 'Post failed — check your connection credentials', 'error');
      }
    } catch {
      showToast('Failed to post', 'error');
    } finally {
      setPosting(false);
    }
  };

  const isOverLimit = plt?.maxChars ? charCount > plt.maxChars : false;

  return (
    <div className="bg-[#111520] border border-white/5 rounded-2xl overflow-hidden">
      {/* Platform tabs */}
      <div className="flex border-b border-white/5">
        {Object.entries(PLATFORMS).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => { setPlatform(key); setSelectedConn(null); }}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-semibold transition-all",
              platform === key ? 'text-white border-b-2' : 'text-white/30 hover:text-white/60'
            )}
            style={platform === key ? { borderColor: cfg.color } : {}}
          >
            <span className="text-base leading-none">{cfg.icon}</span>
            {cfg.label}
          </button>
        ))}
      </div>

      <div className="p-5 space-y-4">
        {/* Topic + tone row */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-[11px] text-white/35 mb-1.5 block uppercase tracking-wider">Topic</label>
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder={`What do you want to post about? e.g. "Tips for new home buyers"`}
              className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20"
            />
          </div>
          <div>
            <label className="text-[11px] text-white/35 mb-1.5 block uppercase tracking-wider">Tone</label>
            <select
              value={tone}
              onChange={e => setTone(e.target.value)}
              className="bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white/70 focus:outline-none"
            >
              {TONES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAIDraft}
              disabled={drafting || !topic.trim()}
              className="h-10 px-4 rounded-xl bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap"
            >
              {drafting
                ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Drafting...</>
                : <><Sparkles className="w-3.5 h-3.5" /> AI Draft</>
              }
            </button>
          </div>
        </div>

        {/* Content editor */}
        <div>
          <label className="text-[11px] text-white/35 mb-1.5 block uppercase tracking-wider">Content</label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={`Write your ${plt?.label} post here, or use AI Draft above...`}
            rows={7}
            className={cn(
              "w-full bg-white/5 border rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/18 focus:outline-none resize-none leading-relaxed transition-colors",
              isOverLimit ? 'border-red-500/50 focus:border-red-500' : 'border-white/8 focus:border-white/20'
            )}
          />
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-white/20">Markdown supported</span>
            {plt?.maxChars && (
              <span className={cn("text-[11px] font-medium", isOverLimit ? 'text-red-400' : charCount > (plt.maxChars * 0.85) ? 'text-amber-400' : 'text-white/25')}>
                {charCount.toLocaleString()} / {plt.maxChars.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Account selector + post actions */}
        <div className="flex items-center gap-3 pt-1">
          {platformConns.length > 0 ? (
            <div className="relative flex-1">
              <select
                value={selectedConn ?? ''}
                onChange={e => setSelectedConn(Number(e.target.value) || null)}
                className="w-full appearance-none bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white/60 focus:outline-none pr-7"
              >
                <option value="">Select account to publish...</option>
                {platformConns.map(c => {
                  const meta = c.metadata as Record<string, unknown> | null;
                  const display = (meta?.pageName as string) || (meta?.businessName as string) || c.accountLabel || c.displayName || c.platform;
                  return <option key={c.id} value={c.id}>{display}</option>;
                })}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
            </div>
          ) : (
            <div className="flex-1 text-xs text-white/30 flex items-center gap-1.5 bg-white/3 border border-white/5 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              No {plt?.label} account connected — go to Integrations to connect one
            </div>
          )}
          <button
            onClick={handleSaveForApproval}
            disabled={saving || !content.trim() || isOverLimit}
            className="h-10 px-4 rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-30"
          >
            <Clock className="w-3.5 h-3.5" /> Queue
          </button>
          <button
            onClick={handlePostNow}
            disabled={posting || !content.trim() || !selectedConn || isOverLimit}
            className="h-10 px-5 rounded-xl text-white text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-30"
            style={{ background: plt?.color ?? '#6366f1' }}
          >
            {posting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Post Now
          </button>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn(
              "mx-5 mb-5 px-4 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2",
              toast.type === 'success' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/15 text-red-400 border border-red-500/20'
            )}
          >
            {toast.type === 'success' ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Analytics bar ─────────────────────────────────────────────────────────

function StatsBar({ posts }: { posts: SocialPost[] }) {
  const total = posts.length;
  const pending = posts.filter(p => p.status === 'pending_approval').length;
  const posted = posts.filter(p => p.status === 'posted').length;
  const failed = posts.filter(p => p.status === 'failed').length;
  const aiGenerated = posts.filter(p => p.aiGenerated).length;

  const byPlatform = Object.keys(PLATFORMS).reduce((acc, k) => {
    acc[k] = posts.filter(p => p.platform === k).length;
    return acc;
  }, {} as Record<string, number>);

  const stats = [
    { label: 'Total posts', value: total, color: '#6366f1' },
    { label: 'Pending review', value: pending, color: '#f59e0b' },
    { label: 'Published', value: posted, color: '#10b981' },
    { label: 'AI generated', value: aiGenerated, color: '#a855f7' },
    { label: 'Failed', value: failed, color: '#ef4444' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
      {stats.map(s => (
        <div key={s.label} className="bg-[#111520] border border-white/5 rounded-2xl px-4 py-3">
          <p className="text-2xl font-display font-bold text-white">{s.value}</p>
          <p className="text-xs text-white/35 mt-0.5">{s.label}</p>
          <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full rounded-full" style={{ background: s.color, width: `${total > 0 ? (s.value / total) * 100 : 0}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Platform breakdown ────────────────────────────────────────────────────

function PlatformBreakdown({ posts }: { posts: SocialPost[] }) {
  if (posts.length === 0) return null;

  return (
    <div className="bg-[#111520] border border-white/5 rounded-2xl p-5 mt-4">
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-primary" /> Posts by Platform
      </h3>
      <div className="space-y-3">
        {Object.entries(PLATFORMS).map(([key, cfg]) => {
          const count = posts.filter(p => p.platform === key).length;
          const pct = posts.length > 0 ? (count / posts.length) * 100 : 0;
          return (
            <div key={key} className="flex items-center gap-3">
              <span className="text-sm w-24 shrink-0" style={{ color: cfg.color }}>{cfg.label}</span>
              <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: cfg.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                />
              </div>
              <span className="text-xs text-white/30 w-6 text-right">{count}</span>
            </div>
          );
        })}
      </div>

      {/* Status breakdown */}
      <h3 className="text-sm font-semibold text-white mt-6 mb-4 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary" /> Posts by Status
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const count = posts.filter(p => p.status === key).length;
          if (count === 0) return null;
          return (
            <div key={key} className="rounded-xl px-3 py-2" style={{ background: cfg.bg }}>
              <p className="text-lg font-bold" style={{ color: cfg.color }}>{count}</p>
              <p className="text-[11px] text-white/35">{cfg.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

type Tab = 'compose' | 'queue' | 'history' | 'analytics';

export default function Social() {
  const { businessTag } = useAppStore();
  const [tab, setTab] = useState<Tab>('compose');
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [editPost, setEditPost] = useState<SocialPost | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [globalToast, setGlobalToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const loadPosts = useCallback(async () => {
    try {
      const res = await fetch(`/api/social-posts?businessTag=${businessTag}`);
      if (res.ok) setPosts(await res.json());
    } catch {}
  }, [businessTag]);

  const { account } = useAppStore();
  const wsHeader = { 'X-Workspace': account?.workspace ?? 'general' };

  const loadConnections = useCallback(async () => {
    try {
      const res = await fetch('/api/connections', { headers: wsHeader });
      if (res.ok) setConnections(await res.json());
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.workspace]);

  useEffect(() => {
    Promise.all([loadPosts(), loadConnections()]).finally(() => setLoading(false));
  }, [loadPosts, loadConnections]);

  const showGlobalToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setGlobalToast({ msg, type });
    setTimeout(() => setGlobalToast(null), 3500);
  };

  const handlePostCreated = (post: SocialPost) => {
    setPosts(prev => {
      const idx = prev.findIndex(p => p.id === post.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = post; return next; }
      return [post, ...prev];
    });
  };

  const handleApprove = async (post: SocialPost) => {
    try {
      const res = await fetch(`/api/social-posts/${post.id}/approve`, { method: 'POST' });
      const result = await res.json();
      if (!res.ok) {
        showGlobalToast(result?.error ?? 'Failed to approve', 'error');
        return;
      }
      // Auto-published: check whether the publish itself succeeded
      if (result.autoPublished) {
        if (result.post) handlePostCreated(result.post);
        if (result.success) {
          showGlobalToast(`Approved & published to ${PLATFORMS[post.platform]?.label ?? post.platform}! 🎉`);
        } else {
          showGlobalToast(result.errorMessage ?? 'Approved but publishing failed — check connection credentials', 'error');
        }
      } else {
        // Just approved (scheduled or no connection), no immediate publish
        handlePostCreated(result);
        showGlobalToast('Post approved!');
      }
    } catch {
      showGlobalToast('Failed to approve — check your connection', 'error');
    }
  };

  const handlePostNow = async (post: SocialPost, connectionId: number) => {
    // Update connection first if needed
    if (post.connectionId !== connectionId) {
      await fetch(`/api/social-posts/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      });
    }
    try {
      const res = await fetch(`/api/social-posts/${post.id}/post-now`, { method: 'POST' });
      const result = await res.json();
      if (result.post) handlePostCreated(result.post);
      if (result.success) {
        showGlobalToast(`Posted to ${PLATFORMS[post.platform]?.label ?? post.platform}! 🎉`);
      } else {
        showGlobalToast(result.errorMessage ?? 'Post failed — check connection credentials', 'error');
      }
    } catch {
      showGlobalToast('Failed to post', 'error');
    }
  };

  const handleDelete = async (post: SocialPost) => {
    try {
      await fetch(`/api/social-posts/${post.id}`, { method: 'DELETE' });
      setPosts(prev => prev.filter(p => p.id !== post.id));
      showGlobalToast('Post deleted');
    } catch {
      showGlobalToast('Failed to delete', 'error');
    }
  };

  const handleSaveEdit = async () => {
    if (!editPost) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/social-posts/${editPost.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent }),
      });
      if (!res.ok) throw new Error();
      const updated: SocialPost = await res.json();
      handlePostCreated(updated);
      setEditPost(null);
      showGlobalToast('Post updated!');
    } catch {
      showGlobalToast('Failed to save edit', 'error');
    } finally {
      setSaving(false);
    }
  };

  const queuePosts = posts.filter(p => p.status === 'pending_approval' || p.status === 'approved');
  const historyPosts = posts.filter(p => p.status === 'posted' || p.status === 'failed');
  const socialConnections = connections.filter(c => ['linkedin', 'twitter', 'meta'].includes(c.platform));

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: 'compose', label: 'Composer' },
    { key: 'queue', label: 'Approval Queue', count: queuePosts.length },
    { key: 'history', label: 'History', count: historyPosts.length },
    { key: 'analytics', label: 'Analytics' },
  ];

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 sm:px-8 pt-4 sm:pt-8 pb-0 bg-[#0c0e16]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-xl sm:text-2xl font-display font-bold text-white flex items-center gap-2">
                <Share2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> Social Media
              </h1>
              <p className="hidden sm:block text-sm text-white/35 mt-0.5">
                AI-powered content creation · Human approval · One-click publishing
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setLoading(true); Promise.all([loadPosts(), loadConnections()]).finally(() => setLoading(false)); }}
                className="w-9 h-9 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-white/40 hover:text-white transition-all"
              >
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              </button>
              {socialConnections.filter(c => c.isConnected && c.hasToken).length === 0 && (
                <a href="/connections" className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium hover:bg-amber-500/15 transition-all">
                  <AlertCircle className="w-3.5 h-3.5" /> Connect accounts
                </a>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto scrollbar-none -mx-1 px-1">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all",
                  tab === t.key ? 'border-primary text-white' : 'border-transparent text-white/35 hover:text-white/60'
                )}
              >
                {t.label}
                {t.count !== undefined && t.count > 0 && (
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-bold", tab === t.key ? 'bg-primary/20 text-primary' : 'bg-white/8 text-white/40')}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-8 py-5 sm:py-7 max-w-5xl mx-auto">
        <AnimatePresence mode="wait">
          {tab === 'compose' && (
            <motion.div key="compose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Composer — takes 2/3 */}
                <div className="lg:col-span-2">
                  <Composer
                    connections={connections}
                    businessTag={businessTag}
                    onPostCreated={post => { handlePostCreated(post); }}
                  />
                </div>

                {/* Tips + connected accounts sidebar */}
                <div className="space-y-4">
                  <div className="bg-[#111520] border border-white/5 rounded-2xl p-4">
                    <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">Connected Accounts</h3>
                    {socialConnections.length === 0 ? (
                      <p className="text-xs text-white/25 leading-relaxed">
                        No social accounts connected yet. Go to <a href="/connections" className="text-primary hover:underline">Integrations</a> to connect LinkedIn, Twitter/X, or Facebook.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {socialConnections.map(conn => {
                          const cfg = PLATFORMS[conn.platform];
                          return (
                            <div key={conn.id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/3 border border-white/5">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style={{ background: `${cfg?.color}20` }}>
                                {cfg?.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-white truncate">{conn.accountLabel || conn.displayName}</p>
                                <p className="text-[10px]" style={{ color: conn.hasToken ? '#10b981' : '#ef4444' }}>
                                  {conn.hasToken ? '● Connected' : '○ Not connected'}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="bg-[#111520] border border-white/5 rounded-2xl p-4">
                    <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">SOSHI Tips</h3>
                    <ul className="space-y-2 text-xs text-white/35 leading-relaxed">
                      <li>🧭 Use the topic field to guide SOSHI — be specific for better results</li>
                      <li>✏️ Always review AI drafts before posting</li>
                      <li>⏰ Queue posts for team review before they go live</li>
                      <li>📊 LinkedIn posts with questions get 50% more engagement</li>
                      <li>🏷️ Keep Twitter posts under 240 chars for best reach</li>
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {tab === 'queue' && (
            <motion.div key="queue" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {queuePosts.length === 0 ? (
                <div className="text-center py-20 text-white/20">
                  <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No posts waiting for approval</p>
                  <button onClick={() => setTab('compose')} className="mt-3 text-primary text-sm hover:underline">
                    Create a post
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-white/30">{queuePosts.length} post{queuePosts.length !== 1 ? 's' : ''} waiting for review</p>
                  <div className="space-y-3">
                    <AnimatePresence mode="popLayout">
                      {queuePosts.map(post => (
                        <PostCard
                          key={post.id}
                          post={post}
                          connections={connections}
                          onApprove={handleApprove}
                          onPostNow={handlePostNow}
                          onDelete={handleDelete}
                          onEdit={p => { setEditPost(p); setEditContent(p.content); }}
                          onPostUpdated={handlePostCreated}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {tab === 'history' && (
            <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {historyPosts.length === 0 ? (
                <div className="text-center py-20 text-white/20">
                  <Share2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No published posts yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {historyPosts.map(post => (
                      <PostCard
                        key={post.id}
                        post={post}
                        connections={connections}
                        onApprove={handleApprove}
                        onPostNow={handlePostNow}
                        onDelete={handleDelete}
                        onEdit={p => { setEditPost(p); setEditContent(p.content); }}
                        showActions={post.status === 'failed'}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}

          {tab === 'analytics' && (
            <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {posts.length === 0 ? (
                <div className="text-center py-20 text-white/20">
                  <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Create your first post to see analytics</p>
                </div>
              ) : (
                <>
                  <StatsBar posts={posts} />
                  <PlatformBreakdown posts={posts} />

                  {/* AI usage card */}
                  <div className="mt-4 bg-[#111520] border border-white/5 rounded-2xl p-5">
                    <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                      <Bot className="w-4 h-4 text-violet-400" /> AI Content Usage
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: 'AI Drafted', value: posts.filter(p => p.aiGenerated).length, color: '#a855f7' },
                        { label: 'Human Written', value: posts.filter(p => !p.aiGenerated).length, color: '#6b7280' },
                        { label: 'AI Approval Rate', value: posts.filter(p => p.aiGenerated && p.status === 'posted').length > 0
                          ? `${Math.round((posts.filter(p => p.aiGenerated && p.status === 'posted').length / Math.max(posts.filter(p => p.aiGenerated).length, 1)) * 100)}%`
                          : '—', color: '#10b981' },
                      ].map(item => (
                        <div key={item.label} className="rounded-xl bg-white/3 border border-white/5 p-4">
                          <p className="text-2xl font-display font-bold" style={{ color: item.color }}>{item.value}</p>
                          <p className="text-xs text-white/35 mt-0.5">{item.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Edit post modal */}
      <AnimatePresence>
        {editPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#131622] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-white">Edit Post</h2>
                  <PlatformBadge platform={editPost.platform} />
                </div>
                <button onClick={() => setEditPost(null)} className="text-white/40 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5">
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  rows={8}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/20 resize-none leading-relaxed"
                  autoFocus
                />
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setEditPost(null)} className="flex-1 py-2.5 rounded-xl border border-white/8 text-white/50 hover:text-white text-sm transition-all">
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={saving || !editContent.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all"
                  >
                    {saving ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global toast */}
      <AnimatePresence>
        {globalToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={cn(
              "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-2xl flex items-center gap-2",
              globalToast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
            )}
          >
            {globalToast.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {globalToast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
