import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { Send, Plus, MessageSquare, Bot, CornerDownLeft, ChevronLeft, Search, Sparkles } from 'lucide-react';
import {
  useListAgents,
  useListAnthropicConversations,
  useCreateAnthropicConversation,
  useGetAnthropicConversation,
} from '@workspace/api-client-react';
import { useAppStore } from '@/store';
import { useChatStream } from '@/hooks/use-chat-stream';
import { Button, Input, cn } from '@/components/ui-elements';

// ─── Agent Team Grid ─────────────────────────────────────────────────────────

function AgentCard({
  agent,
  onSelect,
}: {
  agent: any;
  onSelect: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl overflow-hidden border border-white/5 bg-[#111520] hover:border-white/10 transition-colors cursor-pointer group"
      onClick={onSelect}
    >
      {/* Colored top banner */}
      <div
        className="h-28 flex items-center justify-center relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${agent.color}30, ${agent.color}10)` }}
      >
        <div
          className="absolute inset-0 opacity-20"
          style={{ background: `radial-gradient(circle at 50% 80%, ${agent.color}, transparent 70%)` }}
        />
        <span className="text-5xl relative z-10 drop-shadow-lg group-hover:scale-110 transition-transform duration-300">
          {agent.icon || '🤖'}
        </span>
      </div>

      {/* Card body */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-base font-display font-bold text-white">{agent.name}</h3>
          <div
            className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
            style={{ backgroundColor: agent.color, boxShadow: `0 0 6px ${agent.color}` }}
          />
        </div>
        <p className="text-xs text-white/50 leading-relaxed line-clamp-2 mb-5">
          {agent.roleDescription}
        </p>
        <button
          onClick={onSelect}
          className="w-full py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200"
          style={{
            borderColor: `${agent.color}40`,
            color: agent.color,
            background: `${agent.color}10`,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = `${agent.color}20`;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = `${agent.color}10`;
          }}
        >
          Chat with {agent.name} →
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Agents() {
  const { businessTag } = useAppStore();
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [search, setSearch] = useState('');

  const { data: agents = [] } = useListAgents();

  const { data: conversations = [] } = useListAnthropicConversations(
    { agentId: selectedAgentId || undefined },
    { query: { enabled: !!selectedAgentId } }
  );

  const filteredConvs = conversations.filter(c => c.businessTag === businessTag);

  const { data: activeConv } = useGetAnthropicConversation(
    selectedConvId as number,
    { query: { enabled: !!selectedConvId } }
  );

  const createConvMutation = useCreateAnthropicConversation();
  const { sendMessage, streamingMessage, isStreaming } = useChatStream(selectedConvId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv?.messages, streamingMessage]);

  const handleNewConversation = () => {
    if (!selectedAgentId) return;
    createConvMutation.mutate({
      data: {
        title: `New Chat — ${format(new Date(), 'MMM d, h:mm a')}`,
        agentId: selectedAgentId,
        businessTag,
      }
    }, {
      onSuccess: (data) => setSelectedConvId(data.id),
    });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || isStreaming) return;
    sendMessage(messageInput);
    setMessageInput('');
  };

  const handleSelectAgent = (agentId: number) => {
    setSelectedAgentId(agentId);
    setSelectedConvId(null);
  };

  const handleBackToTeam = () => {
    setSelectedAgentId(null);
    setSelectedConvId(null);
  };

  const activeAgent = agents.find(a => a.id === selectedAgentId);
  const filteredAgents = agents.filter(
    a => !search || a.name.toLowerCase().includes(search.toLowerCase()) || (a.roleDescription || '').toLowerCase().includes(search.toLowerCase())
  );

  // ── Team Grid (no agent selected) ──
  if (!selectedAgentId) {
    return (
      <div className="h-full overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 px-8 pt-8 pb-6 bg-[#0c0e16]/80 backdrop-blur-md border-b border-white/5">
          <div className="flex items-center justify-between max-w-5xl mx-auto">
            <div>
              <h1 className="text-2xl font-display font-bold text-white">Your AI Team</h1>
              <p className="text-sm text-white/40 mt-0.5">Select a specialist to start working</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search agents..."
                className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-primary/40 w-52"
              />
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="px-8 py-8 max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
            {filteredAgents.map(agent => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onSelect={() => handleSelectAgent(agent.id)}
              />
            ))}
          </div>

          {filteredAgents.length === 0 && (
            <div className="text-center py-16 text-white/30">
              <Bot className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No agents match your search</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Chat view (agent selected) ──
  return (
    <div className="flex h-full">

      {/* Left panel: history */}
      <div className="w-64 flex-shrink-0 border-r border-white/5 bg-[#090b12] flex flex-col">
        {/* Back + Agent header */}
        <div className="p-4 border-b border-white/5">
          <button
            onClick={handleBackToTeam}
            className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/70 transition-colors mb-4"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> All agents
          </button>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: `${activeAgent?.color}20` }}
            >
              {activeAgent?.icon}
            </div>
            <div>
              <p className="text-sm font-bold text-white">{activeAgent?.name}</p>
              <p className="text-xs text-white/35 line-clamp-1">{activeAgent?.roleDescription}</p>
            </div>
          </div>
        </div>

        {/* New chat button */}
        <div className="p-3 border-b border-white/5">
          <button
            onClick={handleNewConversation}
            disabled={createConvMutation.isPending}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/8 border border-white/8 text-white/60 hover:text-white text-sm font-medium transition-all"
          >
            <Plus className="w-4 h-4" /> New chat
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {filteredConvs.length === 0 ? (
            <div className="text-center py-8 text-white/25 text-xs">
              No conversations yet
            </div>
          ) : (
            filteredConvs.map(conv => (
              <button
                key={conv.id}
                onClick={() => setSelectedConvId(conv.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all text-sm",
                  selectedConvId === conv.id
                    ? "bg-white/8 text-white"
                    : "text-white/40 hover:bg-white/5 hover:text-white/80"
                )}
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-50" />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs font-medium">{conv.title}</p>
                  <p className="text-[10px] opacity-50">{format(new Date(conv.createdAt), 'MMM d')}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col bg-[#0c0e16]">
        {!selectedConvId ? (
          /* Empty state — no conversation selected */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-sm">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-6"
                style={{ background: `${activeAgent?.color}20`, boxShadow: `0 0 40px ${activeAgent?.color}20` }}
              >
                {activeAgent?.icon}
              </div>
              <h2 className="text-xl font-display font-bold text-white mb-2">
                Hi, I'm {activeAgent?.name}
              </h2>
              <p className="text-white/40 text-sm leading-relaxed mb-8">{activeAgent?.roleDescription}</p>
              <button
                onClick={handleNewConversation}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: activeAgent?.color, boxShadow: `0 0 24px ${activeAgent?.color}40` }}
              >
                <Sparkles className="w-4 h-4" /> Start a new chat
              </button>
            </motion.div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="h-14 flex items-center px-6 border-b border-white/5 bg-[#090b12]/60 backdrop-blur-sm shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
                  style={{ background: `${activeAgent?.color}20` }}
                >
                  {activeAgent?.icon}
                </div>
                <span className="text-sm font-semibold text-white">{activeAgent?.name}</span>
                <span className="text-white/20">·</span>
                <span className="text-xs text-white/35 truncate max-w-xs">{activeConv?.title}</span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
              {activeConv?.messages?.map(msg => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn("flex gap-3 max-w-3xl", msg.role === 'user' ? "ml-auto flex-row-reverse" : "")}
                >
                  {msg.role === 'assistant' && (
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 mt-0.5"
                      style={{ background: `${activeAgent?.color}20` }}
                    >
                      {activeAgent?.icon}
                    </div>
                  )}
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-full",
                      msg.role === 'user'
                        ? "bg-primary text-white rounded-tr-sm"
                        : "bg-[#161b27] border border-white/5 text-white/85 rounded-tl-sm prose-custom"
                    )}
                  >
                    {msg.role === 'user'
                      ? <p className="whitespace-pre-wrap">{msg.content}</p>
                      : <ReactMarkdown>{msg.content}</ReactMarkdown>
                    }
                  </div>
                </motion.div>
              ))}

              {/* Streaming bubble */}
              {isStreaming && streamingMessage && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 max-w-3xl">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 mt-0.5" style={{ background: `${activeAgent?.color}20` }}>
                    {activeAgent?.icon}
                  </div>
                  <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-[#161b27] border border-white/5 text-white/85 prose-custom text-sm leading-relaxed">
                    <ReactMarkdown>{streamingMessage}</ReactMarkdown>
                    <span className="inline-block w-1.5 h-4 bg-primary animate-pulse ml-0.5 align-middle rounded-sm" />
                  </div>
                </motion.div>
              )}

              {/* Typing dots */}
              {isStreaming && !streamingMessage && (
                <div className="flex gap-3 max-w-3xl">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0" style={{ background: `${activeAgent?.color}20` }}>
                    {activeAgent?.icon}
                  </div>
                  <div className="flex items-center gap-1.5 px-4 py-3 rounded-2xl rounded-tl-sm bg-[#161b27] border border-white/5">
                    {[0, 0.15, 0.3].map((delay, i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: `${delay}s` }} />
                    ))}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-6 pb-6 pt-3 shrink-0">
              <form onSubmit={handleSendMessage} className="flex items-end gap-3 max-w-3xl mx-auto">
                <div className="relative flex-1">
                  <textarea
                    value={messageInput}
                    onChange={e => setMessageInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    placeholder={`Message ${activeAgent?.name}…`}
                    rows={1}
                    className="w-full bg-[#131622] border border-white/8 rounded-2xl pl-5 pr-14 py-4 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-primary/30 resize-none min-h-[52px] max-h-36 shadow-inner"
                  />
                  <div className="absolute right-3.5 bottom-3.5 text-white/15 text-[10px] font-mono flex items-center gap-1">
                    <CornerDownLeft className="w-3 h-3" />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={!messageInput.trim() || isStreaming}
                  className="w-12 h-12 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 flex-shrink-0"
                  style={{ background: activeAgent?.color || '#6366f1' }}
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
