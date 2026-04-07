import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import {
  Send, Plus, MessageSquare, Bot, Search, Sparkles,
  ChevronLeft, Star, Zap, Users, ArrowRight
} from 'lucide-react';
import {
  useListAgents,
  useListAnthropicConversations,
  useCreateAnthropicConversation,
  useGetAnthropicConversation,
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
      className="flex flex-col rounded-2xl border border-white/5 bg-[#111520] hover:border-white/10 transition-all cursor-pointer group overflow-hidden"
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
        <h3 className="text-sm font-display font-bold text-white mb-1">{agent.name}</h3>
        <p className="text-xs text-white/40 leading-relaxed mb-3 line-clamp-2">{agent.roleDescription}</p>

        {/* Capabilities chips */}
        <div className="flex flex-wrap gap-1 mb-4 flex-1">
          {meta.capabilities.slice(0, 4).map(cap => (
            <span key={cap} className="text-[10px] text-white/30 bg-white/5 px-2 py-0.5 rounded-md">{cap}</span>
          ))}
          {meta.capabilities.length > 4 && (
            <span className="text-[10px] text-white/20 px-1">+{meta.capabilities.length - 4}</span>
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

// ─── Chat thread ──────────────────────────────────────────────────────────

function ChatView({
  agent,
  convId,
  conv,
  onBack,
  onNewConv,
}: {
  agent: any;
  convId: number | null;
  conv: any;
  onBack: () => void;
  onNewConv: () => void;
}) {
  const [input, setInput] = useState('');
  const { sendMessage, streamingMessage, isStreaming } = useChatStream(convId);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [conv?.messages, streamingMessage]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming || !convId) return;
    sendMessage(input);
    setInput('');
  };

  const messages = conv?.messages ?? [];

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5 shrink-0">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-all">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: `${agent.color}20` }}>
          {agent.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">{agent.name}</p>
          <p className="text-xs text-white/35 truncate">{agent.roleDescription}</p>
        </div>
        <button onClick={onNewConv} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white text-xs transition-all">
          <Plus className="w-3.5 h-3.5" /> New chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        {messages.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-5xl mb-4">{agent.icon}</div>
            <h3 className="text-lg font-display font-bold text-white mb-2">Chat with {agent.name}</h3>
            <p className="text-sm text-white/35 max-w-sm leading-relaxed">{agent.roleDescription}</p>
          </div>
        )}
        {messages.map((msg: any) => (
          <div key={msg.id} className={cn("flex gap-3", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 mt-0.5" style={{ background: `${agent.color}20` }}>
                {agent.icon}
              </div>
            )}
            <div className={cn(
              "max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
              msg.role === 'user'
                ? 'bg-primary text-white rounded-br-sm'
                : 'bg-white/5 text-white/85 rounded-bl-sm border border-white/5'
            )}>
              {msg.role === 'assistant' ? (
                <div className="prose prose-invert prose-sm max-w-none text-white/85">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : msg.content}
            </div>
          </div>
        ))}
        {isStreaming && streamingMessage && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 mt-0.5" style={{ background: `${agent.color}20` }}>
              {agent.icon}
            </div>
            <div className="max-w-[75%] rounded-2xl rounded-bl-sm px-4 py-3 bg-white/5 border border-white/5">
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
            <div className="flex items-center gap-1.5 px-4 py-3 bg-white/5 rounded-2xl border border-white/5">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="px-6 py-5 border-t border-white/5 shrink-0">
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-white/20 transition-colors">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={`Message ${agent.name}...`}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/25 focus:outline-none"
            disabled={isStreaming || !convId}
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming || !convId}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white disabled:opacity-30 transition-all"
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
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const { data: agents = [] } = useListAgents();
  const { data: conversations = [] } = useListAnthropicConversations(
    { agentId: selectedAgentId || undefined },
    { query: { enabled: !!selectedAgentId } }
  );
  const { data: activeConv } = useGetAnthropicConversation(
    selectedConvId as number,
    { query: { enabled: !!selectedConvId } }
  );
  const createConvMutation = useCreateAnthropicConversation();

  const filteredConvs = conversations.filter(c => c.businessTag === businessTag);
  const activeAgent = agents.find(a => a.id === selectedAgentId);

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

  // ── Chat view ──
  if (selectedAgentId && activeAgent) {
    // Auto-create a conversation if none exists
    const hasConv = selectedConvId || filteredConvs.length > 0;

    return (
      <div className="h-full flex">
        {/* Conversation sidebar */}
        <div className="w-64 shrink-0 bg-[#090b12] border-r border-white/5 flex flex-col">
          <div className="px-4 pt-5 pb-3 border-b border-white/5">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-white/40 hover:text-white text-xs transition-colors mb-4"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back to team
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl" style={{ background: `${activeAgent.color}20` }}>
                {activeAgent.icon}
              </div>
              <div>
                <p className="text-xs font-bold text-white">{activeAgent.name}</p>
                <p className="text-[10px] text-white/30">{AGENT_META[activeAgent.slug]?.category ?? 'AI Agent'}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            <button
              onClick={handleNewConv}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 text-xs transition-all border border-dashed border-white/8 mb-2"
            >
              <Plus className="w-3.5 h-3.5" /> New conversation
            </button>
            {filteredConvs.map(conv => (
              <button
                key={conv.id}
                onClick={() => setSelectedConvId(conv.id)}
                className={cn(
                  "w-full flex items-start gap-2 px-3 py-2.5 rounded-xl text-left transition-all",
                  selectedConvId === conv.id ? 'bg-white/8 text-white' : 'text-white/40 hover:bg-white/5 hover:text-white/70'
                )}
              >
                <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{conv.title}</p>
                  <p className="text-[10px] text-white/25">{format(new Date(conv.createdAt), 'MMM d')}</p>
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
              onBack={handleBack}
              onNewConv={handleNewConv}
            />
          ) : (
            <div className="flex flex-col h-full items-center justify-center text-center px-8">
              <div className="text-6xl mb-5">{activeAgent.icon}</div>
              <h2 className="text-xl font-display font-bold text-white mb-2">Start a conversation with {activeAgent.name}</h2>
              <p className="text-sm text-white/40 max-w-sm mb-6 leading-relaxed">{activeAgent.roleDescription}</p>
              <div className="flex flex-wrap gap-2 justify-center mb-6">
                {(AGENT_META[activeAgent.slug]?.capabilities ?? []).map(cap => (
                  <span key={cap} className="text-xs bg-white/5 text-white/40 px-3 py-1 rounded-full border border-white/8">{cap}</span>
                ))}
              </div>
              <button
                onClick={handleNewConv}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all"
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
      <div className="sticky top-0 z-10 px-4 sm:px-8 pt-4 sm:pt-8 pb-4 sm:pb-5 bg-[#0c0e16]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2.5">
                <Users className="w-6 h-6 text-primary" /> AI Team
              </h1>
              <p className="text-sm text-white/35 mt-0.5">
                {agents.length} specialized AI employees · Pick one to start working
              </p>
            </div>
          </div>

          {/* Search + category filter */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search agents..."
                className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-primary/40 w-48"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    categoryFilter === cat ? 'text-white bg-white/10' : 'text-white/35 hover:text-white/60'
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
          <div className="text-center py-20 text-white/20">
            <Bot className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No agents match your search</p>
          </div>
        )}
      </div>
    </div>
  );
}
