import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import {
  Send, Plus, MessageSquare, Bot, Search, Sparkles,
  ChevronLeft, Users, ArrowRight, Share2, X, CheckCircle2,
  Download, Image, Wand2, RefreshCw, Copy, Check,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListAgents,
  useListAnthropicConversations,
  useCreateAnthropicConversation,
  useGetAnthropicConversation,
  getListAnthropicConversationsQueryKey,
  getGetAnthropicConversationQueryKey,
} from '@workspace/api-client-react';
import { useAppStore } from '@/store';
import { useChatStream } from '@/hooks/use-chat-stream';
import { cn } from '@/components/ui-elements';

// ─── Agent specialties for marketplace display ─────────────────────────────

const AGENT_META: Record<string, { category: string; capabilities: string[] }> = {
  compass: {
    category: 'Strategy',
    capabilities: ['Business strategy', 'Market positioning', 'Growth planning', 'Prioritization', 'Competitive analysis'],
  },
  outreach: {
    category: 'Sales',
    capabilities: ['Cold email sequences', 'Follow-up campaigns', 'B2B outreach', 'Subject line writing', 'Sales copy'],
  },
  inkwell: {
    category: 'Writing',
    capabilities: ['Blog posts', 'Landing page copy', 'Proposals & contracts', 'Website content', 'Brand messaging'],
  },
  scout: {
    category: 'Research',
    capabilities: ['Competitor research', 'Market analysis', 'Industry trends', 'Opportunity identification', 'Reports'],
  },
  ops: {
    category: 'Operations',
    capabilities: ['SOPs & checklists', 'Process design', 'Meeting agendas', 'Task planning', 'Team coordination'],
  },
  desk: {
    category: 'Client Comms',
    capabilities: ['Client onboarding', 'Support responses', 'Professional emails', 'Relationship management'],
  },
  cassie: {
    category: 'Support',
    capabilities: ['Support tickets', 'FAQ documents', 'Complaint resolution', 'Help desk articles', 'CSAT recovery'],
  },
  soshi: {
    category: 'Social Media',
    capabilities: ['Content calendars', 'Post copy', 'Hashtag strategy', 'Engagement replies', 'Platform strategy'],
  },
  finn: {
    category: 'Finance',
    capabilities: ['Financial reports', 'Expense summaries', 'Invoice templates', 'Budget planning', 'Cash flow'],
  },
  seomi: {
    category: 'SEO',
    capabilities: ['Keyword research', 'Content optimization', 'Meta descriptions', 'SEO audits', 'Link strategy'],
  },
  dexie: {
    category: 'Analytics',
    capabilities: ['KPI analysis', 'Data reports', 'Trend spotting', 'Performance insights', 'Dashboard design'],
  },
  emma: {
    category: 'Email Marketing',
    capabilities: ['Email sequences', 'Newsletter design', 'Drip campaigns', 'Subject line testing', 'List segmentation'],
  },
  milli: {
    category: 'Sales Coaching',
    capabilities: ['Sales scripts', 'Objection handling', 'Closing techniques', 'Pipeline strategy', 'Follow-up playbooks'],
  },
  hiro: {
    category: 'HR',
    capabilities: ['Job descriptions', 'Interview questions', 'Offer letters', 'Onboarding plans', 'Culture building'],
  },
  lex: {
    category: 'Legal',
    capabilities: ['Contract summaries', 'Terms of service', 'Privacy policies', 'Compliance checklists', 'NDA drafts'],
  },
  nova: {
    category: 'Project Management',
    capabilities: ['Project plans', 'Sprint goals', 'Milestone timelines', 'Risk logs', 'Stakeholder updates'],
  },
  pixel: {
    category: 'Visual Art',
    capabilities: ['AI image prompts', 'Social media graphics', 'Ad creatives', 'Brand imagery', 'Platform-sized visuals'],
  },
};

const CATEGORY_COLORS: Record<string, string> = {
  Strategy: '#6366f1',
  Sales: '#f59e0b',
  Writing: '#10b981',
  Research: '#3b82f6',
  Operations: '#8b5cf6',
  'Client Comms': '#ef4444',
  Support: '#06b6d4',
  'Social Media': '#ec4899',
  Finance: '#16a34a',
  SEO: '#f97316',
  Analytics: '#0ea5e9',
  'Email Marketing': '#a855f7',
  'Sales Coaching': '#dc2626',
  HR: '#7c3aed',
  Legal: '#64748b',
  'Project Management': '#0891b2',
  'Visual Art': '#f43f5e',
};

// ─── Marketplace card ──────────────────────────────────────────────────────

function AgentCard({ agent, onSelect }: { agent: any; onSelect: () => void }) {
  const meta = AGENT_META[agent.slug] ?? { category: 'AI Agent', capabilities: [] };
  const catColor = CATEGORY_COLORS[meta.category] ?? agent.color;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col rounded-2xl border border-gray-100 bg-white hover:border-gray-200 transition-all cursor-pointer group overflow-hidden"
    >
      {/* Color banner */}
      <div
        className="h-24 flex items-center justify-center relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${agent.color}35, ${agent.color}10)` }}
      >
        <div className="absolute inset-0 opacity-30" style={{ background: `radial-gradient(circle at 50% 100%, ${agent.color}, transparent 70%)` }} />
        <span className="text-5xl relative z-10 drop-shadow-lg group-hover:scale-110 transition-transform duration-300">
          {agent.icon ?? '🤖'}
        </span>
        <div
          className="absolute top-3 right-3 text-[10px] font-bold px-2 py-1 rounded-full"
          style={{ background: `${catColor}25`, color: catColor }}
        >
          {meta.category}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-sm font-display font-bold text-gray-900 mb-1">{agent.name}</h3>
        <p className="text-xs text-gray-400 leading-relaxed mb-3 line-clamp-2">{agent.roleDescription}</p>

        {/* Capabilities chips */}
        <div className="flex flex-wrap gap-1 mb-4 flex-1">
          {meta.capabilities.slice(0, 4).map(cap => (
            <span key={cap} className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md">{cap}</span>
          ))}
          {meta.capabilities.length > 4 && (
            <span className="text-[10px] text-gray-300 px-1">+{meta.capabilities.length - 4}</span>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={onSelect}
          className="w-full py-2.5 rounded-xl text-xs font-semibold border transition-all"
          style={{ borderColor: `${agent.color}40`, color: agent.color, background: `${agent.color}10` }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${agent.color}20`; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = `${agent.color}10`; }}
        >
          Chat with {agent.name} →
        </button>
      </div>
    </motion.div>
  );
}

// ─── PIXEL Image Generator Panel ───────────────────────────────────────────

const PIXEL_RATIOS = [
  { label: 'Square 1:1', value: '1:1', w: 1080, h: 1080, hint: 'Instagram / Facebook post' },
  { label: 'Portrait 4:5', value: '4:5', w: 1080, h: 1350, hint: 'Instagram portrait' },
  { label: 'Story 9:16', value: '9:16', w: 1080, h: 1920, hint: 'Stories / Reels cover' },
  { label: 'Landscape 16:9', value: '16:9', w: 1280, h: 720, hint: 'YouTube / banner' },
  { label: 'Facebook 1.91:1', value: '1.91:1', w: 1200, h: 630, hint: 'Facebook link post' },
];

function buildPollinationsUrl(prompt: string, w: number, h: number): string {
  const encoded = encodeURIComponent(prompt);
  return `https://image.pollinations.ai/prompt/${encoded}?width=${w}&height=${h}&model=flux&nologo=true&seed=${Math.floor(Math.random() * 999999)}`;
}

function ImageGeneratorPanel({ agentColor }: { agentColor: string }) {
  const [prompt, setPrompt] = useState('');
  const [ratio, setRatio] = useState(PIXEL_RATIOS[0]);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const generate = () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(false);
    const url = buildPollinationsUrl(prompt.trim(), ratio.w, ratio.h);
    setImgUrl(url);
  };

  const regenerate = () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(false);
    setImgUrl(null);
    setTimeout(() => {
      const url = buildPollinationsUrl(prompt.trim(), ratio.w, ratio.h);
      setImgUrl(url);
    }, 50);
  };

  const handleDownload = async () => {
    if (!imgUrl) return;
    try {
      const resp = await fetch(imgUrl);
      const blob = await resp.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `pixel-image-${Date.now()}.png`;
      a.click();
    } catch {
      window.open(imgUrl, '_blank');
    }
  };

  return (
    <div className="border-t border-gray-200 bg-[#f8fafc] shrink-0">
      <div className="px-4 py-3 flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-sm" style={{ background: `${agentColor}25` }}>
          🎨
        </div>
        <p className="text-xs font-semibold text-gray-600">PIXEL Image Generator</p>
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">AI Powered</span>
      </div>

      {/* Ratio picker */}
      <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto">
        {PIXEL_RATIOS.map(r => (
          <button
            key={r.value}
            onClick={() => setRatio(r)}
            className={cn(
              "shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all",
              ratio.value === r.value
                ? "border-rose-400/40 bg-rose-400/10 text-rose-300"
                : "border-gray-200 bg-gray-50 text-gray-400 hover:text-gray-500"
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Prompt input */}
      <div className="px-4 pb-3 flex gap-2">
        <input
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && generate()}
          placeholder="Paste PIXEL's image prompt here to generate..."
          className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-rose-400/30"
        />
        <button
          onClick={generate}
          disabled={!prompt.trim() || loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-900 disabled:opacity-40 transition-all"
          style={{ background: agentColor }}
        >
          <Wand2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Generate</span>
        </button>
      </div>

      {/* Image preview */}
      <AnimatePresence mode="wait">
        {imgUrl && (
          <motion.div
            key={imgUrl}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="px-4 pb-4"
          >
            <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-50">
              {loading && !error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm z-10 gap-3">
                  <div className="w-8 h-8 border-2 border-rose-400/30 border-t-rose-400 rounded-full animate-spin" />
                  <p className="text-xs text-gray-400">Generating your image…</p>
                </div>
              )}
              {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 z-10 gap-2">
                  <p className="text-xs text-red-400">Generation failed — try regenerating</p>
                </div>
              )}
              <img
                src={imgUrl}
                alt="PIXEL generated image"
                onLoad={() => setLoading(false)}
                onError={() => { setLoading(false); setError(true); }}
                className="w-full max-h-64 object-contain"
              />
              {!loading && !error && (
                <div className="absolute top-2 right-2 flex gap-1.5">
                  <button
                    onClick={regenerate}
                    className="w-8 h-8 rounded-lg bg-black/40 backdrop-blur-sm flex items-center justify-center text-gray-600 hover:text-gray-900 border border-gray-200 transition-all"
                    title="Regenerate"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleDownload}
                    className="w-8 h-8 rounded-lg bg-black/40 backdrop-blur-sm flex items-center justify-center text-gray-600 hover:text-gray-900 border border-gray-200 transition-all"
                    title="Download image"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
            {!loading && !error && (
              <p className="text-[10px] text-gray-400 mt-1.5 text-center">{ratio.hint} · {ratio.w}×{ratio.h}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Handoff Modal ─────────────────────────────────────────────────────────

function HandoffModal({
  convId,
  currentAgent,
  allAgents,
  onClose,
  onHandoff,
}: {
  convId: number;
  currentAgent: any;
  allAgents: any[];
  onClose: () => void;
  onHandoff: (targetAgentId: number, convId: number) => void;
}) {
  const { addNotification } = useAppStore();
  const [targetAgentId, setTargetAgentId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const otherAgents = allAgents.filter(a => a.id !== currentAgent.id);

  const handleHandoff = async () => {
    if (!targetAgentId) return;
    setSending(true);
    try {
      const res = await fetch(`/api/anthropic/conversations/${convId}/handoff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetAgentId, note }),
      });
      const data = await res.json();
      if (res.ok) {
        const tgt = allAgents.find(a => a.id === targetAgentId);
        addNotification({
          type: 'agentHandoff',
          icon: tgt?.icon ?? '🤝',
          title: 'Conversation handed off',
          body: `${currentAgent.name} passed this conversation to ${tgt?.name ?? 'a colleague'}.`,
          action: { label: 'Open chat', href: '/agents' },
        });
        setDone(true);
        setTimeout(() => {
          onHandoff(targetAgentId, data.conversationId);
          onClose();
        }, 1200);
      }
    } finally {
      setSending(false);
    }
  };

  const targetAgent = allAgents.find(a => a.id === targetAgentId);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
        className="relative w-full sm:max-w-lg bg-white border border-gray-200 rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 sm:hidden"><div className="w-10 h-1 rounded-full bg-gray-200" /></div>

        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: `${currentAgent.color}20` }}>
            {currentAgent.icon}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Pass to a colleague</p>
            <p className="text-xs text-gray-400">Context from this chat will be included automatically</p>
          </div>
          <button onClick={onClose} className="ml-auto w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-900">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {done ? (
            <div className="flex flex-col items-center py-6 gap-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              <p className="text-sm font-semibold text-gray-900">Handoff created!</p>
              <p className="text-xs text-gray-400">Switching to {targetAgent?.name}…</p>
            </div>
          ) : (
            <>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Choose a colleague</p>
                <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {otherAgents.map(agent => (
                    <button
                      key={agent.id}
                      onClick={() => setTargetAgentId(agent.id)}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all",
                        targetAgentId === agent.id
                          ? "border-primary/40 bg-primary/10"
                          : "border-gray-100 bg-gray-50 hover:bg-gray-50"
                      )}
                    >
                      <span className="text-lg">{agent.icon}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">{agent.name}</p>
                        <p className="text-[10px] text-gray-400 truncate">{AGENT_META[agent.slug]?.category ?? 'AI'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Additional instructions for {targetAgent?.name ?? 'colleague'} (optional)</label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder={`e.g. "Focus on the email sequence part" or "Expand on the pricing section"`}
                  rows={2}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-primary/40 resize-none"
                />
              </div>

              {targetAgent && (
                <div className="flex gap-2 p-3 rounded-xl bg-gray-50 border border-gray-100 items-center">
                  <span className="text-2xl">{targetAgent.icon}</span>
                  <div>
                    <p className="text-xs font-semibold text-gray-900">{currentAgent.name} → {targetAgent.name}</p>
                    <p className="text-[10px] text-gray-400">Last 6 messages will be shared as context</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 ml-auto" />
                </div>
              )}

              <button
                onClick={handleHandoff}
                disabled={!targetAgentId || sending}
                className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 text-gray-900 text-sm font-semibold transition-all flex items-center justify-center gap-2"
              >
                {sending ? (
                  <><span className="w-4 h-4 border-2 border-gray-1000 border-t-white rounded-full animate-spin" /> Creating handoff…</>
                ) : (
                  <><Share2 className="w-4 h-4" /> Pass to {targetAgent?.name ?? 'colleague'}</>
                )}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Chat thread ──────────────────────────────────────────────────────────

function ChatView({
  agent,
  convId,
  conv,
  allAgents,
  onBack,
  onNewConv,
  onHandoff,
}: {
  agent: any;
  convId: number | null;
  conv: any;
  allAgents: any[];
  onBack: () => void;
  onNewConv: () => void;
  onHandoff: (targetAgentId: number, newConvId: number) => void;
}) {
  const [input, setInput] = useState('');
  const [showHandoff, setShowHandoff] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<number | null>(null);
  const { sendMessage, streamingMessage, isStreaming } = useChatStream(convId);
  const endRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const handleCopyMessage = (id: number, content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedMsgId(id);
      setTimeout(() => setCopiedMsgId(null), 2000);
    });
  };

  const handleExportConversation = () => {
    const msgs = conv?.messages ?? [];
    if (!msgs.length) return;
    const lines = [
      `Conversation with ${agent.name}`,
      `Exported: ${format(new Date(), 'PPPp')}`,
      '─'.repeat(60),
      '',
      ...msgs.map((m: any) => [
        `[${m.role === 'user' ? 'You' : agent.name}]`,
        m.content,
        '',
      ].join('\n')),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${agent.slug}-chat-${format(new Date(), 'yyyy-MM-dd')}.txt`;
    a.click();
  };

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [conv?.messages, streamingMessage]);

  const messages = conv?.messages ?? [];

  // ── Handoff auto-response polling ─────────────────────────────────────────
  // When the last message in a handoff conversation is from 'user' and no
  // streaming is active, the agent's auto-response is being generated in the
  // background. Poll every 2.5s until the assistant message arrives.
  const lastMsg = messages[messages.length - 1];
  const awaitingAutoResponse = !!convId && messages.length > 0 && lastMsg?.role === 'user' && !isStreaming;

  const refetchConv = useCallback(() => {
    if (convId) queryClient.invalidateQueries({ queryKey: [`/api/anthropic/conversations/${convId}`] });
  }, [convId, queryClient]);

  useEffect(() => {
    if (!awaitingAutoResponse) return;
    const timer = setInterval(refetchConv, 2500);
    return () => clearInterval(timer);
  }, [awaitingAutoResponse, refetchConv]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming || !convId) return;
    sendMessage(input);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-4 border-b border-gray-100 shrink-0">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-50 text-gray-400 hover:text-gray-900 transition-all">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: `${agent.color}20` }}>
          {agent.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">{agent.name}</p>
          <p className="text-xs text-gray-400 truncate hidden sm:block">{agent.roleDescription}</p>
        </div>
        {/* Pass to colleague */}
        {convId && (
          <button
            onClick={() => setShowHandoff(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-400 hover:text-gray-900 text-xs transition-all"
            title="Pass this conversation to another agent"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pass to</span>
          </button>
        )}
        {/* Export conversation */}
        {conv?.messages?.length > 0 && (
          <button
            onClick={handleExportConversation}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-900 text-xs transition-all"
            title="Export conversation as .txt"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
        )}
        <button onClick={onNewConv} className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-900 text-xs transition-all">
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New chat</span>
        </button>
      </div>

      {/* Handoff modal */}
      <AnimatePresence>
        {showHandoff && convId && (
          <HandoffModal
            convId={convId}
            currentAgent={agent}
            allAgents={allAgents}
            onClose={() => setShowHandoff(false)}
            onHandoff={(targetId, newConvId) => {
              setShowHandoff(false);
              onHandoff(targetId, newConvId);
            }}
          />
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        {messages.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-5xl mb-4">{agent.icon}</div>
            <h3 className="text-lg font-display font-bold text-gray-900 mb-2">Chat with {agent.name}</h3>
            <p className="text-sm text-gray-400 max-w-sm leading-relaxed">{agent.roleDescription}</p>
          </div>
        )}
        {messages.map((msg: any) => (
          <div key={msg.id} className={cn("flex gap-3 group", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 mt-0.5" style={{ background: `${agent.color}20` }}>
                {agent.icon}
              </div>
            )}
            <div className="relative flex flex-col max-w-[75%]">
              <div className={cn(
                "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                msg.role === 'user'
                  ? 'bg-primary text-gray-900 rounded-br-sm'
                  : 'bg-gray-50 text-white/85 rounded-bl-sm border border-gray-100'
              )}>
                {msg.role === 'assistant' ? (
                  <div className="prose prose-invert prose-sm max-w-none text-white/85">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : msg.content}
              </div>
              {/* Copy button — visible on group hover */}
              <button
                onClick={() => handleCopyMessage(msg.id, msg.content)}
                className={cn(
                  "absolute -bottom-5 flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] transition-all opacity-0 group-hover:opacity-100",
                  msg.role === 'user' ? 'right-0 text-gray-400 hover:text-gray-500' : 'left-0 text-gray-400 hover:text-gray-500'
                )}
              >
                {copiedMsgId === msg.id ? (
                  <><Check className="w-2.5 h-2.5 text-emerald-400" /><span className="text-emerald-400">Copied</span></>
                ) : (
                  <><Copy className="w-2.5 h-2.5" />Copy</>
                )}
              </button>
            </div>
          </div>
        ))}
        {isStreaming && streamingMessage && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 mt-0.5" style={{ background: `${agent.color}20` }}>
              {agent.icon}
            </div>
            <div className="max-w-[75%] rounded-2xl rounded-bl-sm px-4 py-3 bg-gray-50 border border-gray-100">
              <div className="prose prose-invert prose-sm max-w-none text-white/85 text-sm leading-relaxed">
                <ReactMarkdown>{streamingMessage}</ReactMarkdown>
              </div>
            </div>
          </div>
        )}
        {isStreaming && !streamingMessage && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0" style={{ background: `${agent.color}20` }}>
              {agent.icon}
            </div>
            <div className="flex items-center gap-1.5 px-4 py-3 bg-gray-50 rounded-2xl border border-gray-100">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
          </div>
        )}
        {awaitingAutoResponse && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0" style={{ background: `${agent.color}20` }}>
              {agent.icon}
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 px-4 py-3 bg-gray-50 rounded-2xl border border-gray-100">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
              <p className="text-[10px] text-gray-400 pl-4">{agent.name} is reviewing the brief…</p>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* PIXEL image generator panel */}
      {agent.slug === 'pixel' && <ImageGeneratorPanel agentColor={agent.color} />}

      {/* Input */}
      <form onSubmit={handleSend} className="px-4 sm:px-6 py-4 sm:py-5 border-t border-gray-100 shrink-0">
        <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus-within:border-white/20 transition-colors">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={agent.slug === 'pixel' ? 'Ask PIXEL to design a visual…' : `Message ${agent.name}...`}
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
            disabled={isStreaming || !convId}
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming || !convId}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-900 disabled:opacity-30 transition-all"
            style={{ background: input.trim() && !isStreaming ? agent.color : 'rgba(255,255,255,0.1)' }}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function Agents() {
  const { businessTag } = useAppStore();
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [convSearch, setConvSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [deepLinkHandled, setDeepLinkHandled] = useState(false);

  const { data: agents = [] } = useListAgents();
  const { data: conversations = [] } = useListAnthropicConversations(
    { agentId: selectedAgentId || undefined },
    { query: { enabled: !!selectedAgentId, queryKey: getListAnthropicConversationsQueryKey({ agentId: selectedAgentId || undefined }) } }
  );
  const { data: activeConv } = useGetAnthropicConversation(
    selectedConvId as number,
    { query: { enabled: !!selectedConvId, queryKey: getGetAnthropicConversationQueryKey(selectedConvId as number) } }
  );
  const createConvMutation = useCreateAnthropicConversation();

  const filteredConvs = conversations
    .filter(c => c.businessTag === businessTag)
    .filter(c => !convSearch || c.title?.toLowerCase().includes(convSearch.toLowerCase()));
  const activeAgent = agents.find(a => a.id === selectedAgentId);

  // ── Deep-link support: ?agent=pixel&conv=123 ─────────────────────────────
  // Used by SOSHI's "Open PIXEL" toast button
  useEffect(() => {
    if (deepLinkHandled || agents.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const agentSlug = params.get('agent');
    const convId = params.get('conv');
    if (agentSlug) {
      const target = agents.find(a => a.slug === agentSlug);
      if (target) {
        setSelectedAgentId(target.id);
        if (convId) setSelectedConvId(parseInt(convId));
        // Clean up the URL without a full reload
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
    setDeepLinkHandled(true);
  }, [agents, deepLinkHandled]);

  const categories = ['all', ...Array.from(new Set(
    agents.map(a => AGENT_META[a.slug]?.category ?? 'Other')
  ))];

  const filteredAgents = agents.filter(a => {
    const meta = AGENT_META[a.slug] ?? { category: 'Other', capabilities: [] };
    const matchSearch = !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.roleDescription ?? '').toLowerCase().includes(search.toLowerCase()) ||
      meta.capabilities.some(c => c.toLowerCase().includes(search.toLowerCase()));
    const matchCat = categoryFilter === 'all' || meta.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const handleSelectAgent = (agentId: number) => {
    setSelectedAgentId(agentId);
    setSelectedConvId(null);
  };

  const handleNewConv = () => {
    if (!selectedAgentId) return;
    createConvMutation.mutate({
      data: {
        title: `Chat — ${format(new Date(), 'MMM d, h:mm a')}`,
        agentId: selectedAgentId,
        businessTag,
      }
    }, { onSuccess: data => setSelectedConvId(data.id) });
  };

  const handleBack = () => {
    setSelectedAgentId(null);
    setSelectedConvId(null);
  };

  // Handle handoff: switch to the target agent and open the new conversation
  const handleHandoff = (targetAgentId: number, newConvId: number) => {
    setSelectedAgentId(targetAgentId);
    setSelectedConvId(newConvId);
  };

  // ── Chat view ──
  if (selectedAgentId && activeAgent) {
    // Auto-create a conversation if none exists
    const hasConv = selectedConvId || filteredConvs.length > 0;

    return (
      <div className="h-full flex">
        {/* Conversation sidebar */}
        <div className="w-64 shrink-0 bg-white border-r border-gray-100 flex flex-col">
          <div className="px-4 pt-5 pb-3 border-b border-gray-100">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-400 hover:text-gray-900 text-xs transition-colors mb-4"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back to team
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl" style={{ background: `${activeAgent.color}20` }}>
                {activeAgent.icon}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">{activeAgent.name}</p>
                <p className="text-[10px] text-gray-400">{AGENT_META[activeAgent.slug]?.category ?? 'AI Agent'}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            <button
              onClick={handleNewConv}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-gray-400 hover:text-gray-900 hover:bg-gray-50 text-xs transition-all border border-dashed border-gray-200 mb-2"
            >
              <Plus className="w-3.5 h-3.5" /> New conversation
            </button>
            {conversations.filter(c => c.businessTag === businessTag).length > 3 && (
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-300" />
                <input
                  value={convSearch}
                  onChange={e => setConvSearch(e.target.value)}
                  placeholder="Search chats..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-7 pr-3 py-1.5 text-[11px] text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-white/15"
                />
              </div>
            )}
            {filteredConvs.map(conv => (
              <button
                key={conv.id}
                onClick={() => setSelectedConvId(conv.id)}
                className={cn(
                  "w-full flex items-start gap-2 px-3 py-2.5 rounded-xl text-left transition-all",
                  selectedConvId === conv.id ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                )}
              >
                <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{conv.title}</p>
                  <p className="text-[10px] text-gray-400">{format(new Date(conv.createdAt), 'MMM d')}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 min-w-0">
          {selectedConvId ? (
            <ChatView
              agent={activeAgent}
              convId={selectedConvId}
              conv={activeConv}
              allAgents={agents}
              onBack={handleBack}
              onNewConv={handleNewConv}
              onHandoff={handleHandoff}
            />
          ) : (
            <div className="flex flex-col h-full items-center justify-center text-center px-8">
              <div className="text-6xl mb-5">{activeAgent.icon}</div>
              <h2 className="text-xl font-display font-bold text-gray-900 mb-2">Start a conversation with {activeAgent.name}</h2>
              <p className="text-sm text-gray-400 max-w-sm mb-6 leading-relaxed">{activeAgent.roleDescription}</p>
              <div className="flex flex-wrap gap-2 justify-center mb-6">
                {(AGENT_META[activeAgent.slug]?.capabilities ?? []).map(cap => (
                  <span key={cap} className="text-xs bg-gray-50 text-gray-400 px-3 py-1 rounded-full border border-gray-200">{cap}</span>
                ))}
              </div>
              <button
                onClick={handleNewConv}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-gray-900 transition-all"
                style={{ background: activeAgent.color }}
              >
                <Sparkles className="w-4 h-4" /> Start chatting
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Marketplace grid ──
  const catColor = (cat: string) => CATEGORY_COLORS[cat] ?? '#6366f1';

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 sm:px-8 pt-4 sm:pt-8 pb-4 sm:pb-5 bg-[#f8fafc]/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-display font-bold text-gray-900 flex items-center gap-2.5">
                <Users className="w-6 h-6 text-primary" /> AI Team
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">
                {agents.length} specialized AI employees · Pick one to start working
              </p>
            </div>
          </div>

          {/* Search + category filter */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search agents..."
                className="bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary/40 w-48"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    categoryFilter === cat ? 'text-gray-900 bg-gray-100' : 'text-gray-400 hover:text-gray-500'
                  )}
                  style={categoryFilter === cat && cat !== 'all' ? { background: `${catColor(cat)}20`, color: catColor(cat) } : {}}
                >
                  {cat === 'all' ? `All (${agents.length})` : cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="px-4 sm:px-8 py-5 sm:py-8 max-w-6xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredAgents.map(agent => (
            <AgentCard key={agent.id} agent={agent} onSelect={() => handleSelectAgent(agent.id)} />
          ))}
        </div>
        {filteredAgents.length === 0 && (
          <div className="text-center py-20 text-gray-300">
            <Bot className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No agents match your search</p>
          </div>
        )}
      </div>
    </div>
  );
}
