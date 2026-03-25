import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { Send, Plus, MessageSquare, AlertCircle, Bot, CornerDownLeft } from 'lucide-react';
import { 
  useListAgents, 
  useListAnthropicConversations, 
  useCreateAnthropicConversation,
  useGetAnthropicConversation
} from '@workspace/api-client-react';
import { useAppStore } from '@/store';
import { useChatStream } from '@/hooks/use-chat-stream';
import { Button, Input, cn } from '@/components/ui-elements';

export default function Agents() {
  const { businessTag } = useAppStore();
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [messageInput, setMessageInput] = useState('');
  
  const { data: agents = [] } = useListAgents();
  
  const { data: conversations = [] } = useListAnthropicConversations(
    { agentId: selectedAgentId || undefined },
    { query: { enabled: !!selectedAgentId } }
  );
  
  // Filter conversations by current business tag
  const filteredConvs = conversations.filter(c => c.businessTag === businessTag);

  const { data: activeConv } = useGetAnthropicConversation(
    selectedConvId as number,
    { query: { enabled: !!selectedConvId } }
  );

  const createConvMutation = useCreateAnthropicConversation();
  const { sendMessage, streamingMessage, isStreaming } = useChatStream(selectedConvId);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Select first agent by default if none selected
    if (agents.length > 0 && !selectedAgentId) {
      setSelectedAgentId(agents[0].id);
    }
  }, [agents, selectedAgentId]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv?.messages, streamingMessage]);

  const handleNewConversation = () => {
    if (!selectedAgentId) return;
    createConvMutation.mutate({
      data: {
        title: `New Chat - ${format(new Date(), 'MMM d, h:mm a')}`,
        agentId: selectedAgentId,
        businessTag
      }
    }, {
      onSuccess: (data) => setSelectedConvId(data.id)
    });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || isStreaming) return;
    sendMessage(messageInput);
    setMessageInput('');
  };

  const activeAgent = agents.find(a => a.id === selectedAgentId);

  return (
    <div className="flex h-full bg-background">
      {/* Agent & History Sidebar */}
      <div className="w-80 flex-shrink-0 border-r border-border bg-card/30 flex flex-col">
        {/* Agents List (Horizontal Scroll or Grid) */}
        <div className="p-4 border-b border-border/50">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">Specialists</h2>
          <div className="grid grid-cols-2 gap-2">
            {agents.map(agent => (
              <button
                key={agent.id}
                onClick={() => { setSelectedAgentId(agent.id); setSelectedConvId(null); }}
                className={cn(
                  "p-3 rounded-xl flex flex-col items-center gap-2 transition-all border",
                  selectedAgentId === agent.id 
                    ? "bg-white/10 border-white/20 shadow-lg" 
                    : "bg-black/20 border-transparent hover:bg-white/5"
                )}
              >
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-inner relative"
                  style={{ backgroundColor: `${agent.color}20`, color: agent.color }}
                >
                  {agent.icon || '🤖'}
                  {selectedAgentId === agent.id && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-card" />
                  )}
                </div>
                <span className="text-xs font-medium text-white/90 truncate w-full text-center">{agent.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Conversation History */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">History</h2>
            <button 
              onClick={handleNewConversation}
              disabled={!selectedAgentId || createConvMutation.isPending}
              className="p-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
              title="New Conversation"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1">
            {filteredConvs.length === 0 ? (
              <div className="text-center p-4 text-muted-foreground text-sm">
                No active contexts found for this sector.
              </div>
            ) : (
              filteredConvs.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConvId(conv.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors border",
                    selectedConvId === conv.id 
                      ? "bg-white/10 border-white/10 text-white" 
                      : "border-transparent text-muted-foreground hover:bg-white/5 hover:text-white/90"
                  )}
                >
                  <MessageSquare className="w-4 h-4 shrink-0 opacity-70" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{conv.title}</p>
                    <p className="text-xs opacity-60 truncate">{format(new Date(conv.createdAt), 'MMM d, yyyy')}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative bg-[#0a0b10]">
        {!selectedConvId ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            {activeAgent ? (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md">
                <div 
                  className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl mx-auto mb-6 shadow-2xl"
                  style={{ backgroundColor: `${activeAgent.color}15`, border: `1px solid ${activeAgent.color}30` }}
                >
                  {activeAgent.icon}
                </div>
                <h2 className="text-2xl font-display font-bold text-white mb-2">{activeAgent.name} Protocol</h2>
                <p className="text-muted-foreground mb-8 leading-relaxed">{activeAgent.roleDescription}</p>
                <Button onClick={handleNewConversation} size="lg" className="w-full shadow-[0_0_20px_rgba(var(--primary),0.3)]">
                  Initialize Link
                </Button>
              </motion.div>
            ) : (
              <div className="text-muted-foreground flex flex-col items-center">
                <Bot className="w-12 h-12 mb-4 opacity-50" />
                <p>Select an agent to begin</p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="h-16 flex items-center px-6 border-b border-border/50 bg-card/30 backdrop-blur-sm shrink-0">
              <div className="flex items-center gap-3">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                  style={{ backgroundColor: `${activeAgent?.color}20`, color: activeAgent?.color }}
                >
                  {activeAgent?.icon}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{activeAgent?.name}</h3>
                  <p className="text-xs text-muted-foreground">{activeConv?.title}</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {activeConv?.messages?.map((msg) => (
                <motion.div 
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex max-w-3xl",
                    msg.role === 'user' ? "ml-auto" : "mr-auto"
                  )}
                >
                  {msg.role === 'assistant' && (
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mr-3 mt-1"
                      style={{ backgroundColor: `${activeAgent?.color}20`, color: activeAgent?.color }}
                    >
                      {activeAgent?.icon}
                    </div>
                  )}
                  
                  <div className={cn(
                    "rounded-2xl px-5 py-4",
                    msg.role === 'user' 
                      ? "bg-primary text-primary-foreground rounded-tr-sm shadow-md" 
                      : "bg-[#161b27] border border-border/50 text-white/90 rounded-tl-sm prose-custom shadow-sm"
                  )}>
                    {msg.role === 'user' ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    )}
                  </div>
                </motion.div>
              ))}

              {/* Streaming Message Bubble */}
              {isStreaming && streamingMessage && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex max-w-3xl mr-auto">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mr-3 mt-1"
                    style={{ backgroundColor: `${activeAgent?.color}20`, color: activeAgent?.color }}
                  >
                    {activeAgent?.icon}
                  </div>
                  <div className="rounded-2xl px-5 py-4 bg-[#161b27] border border-border/50 text-white/90 rounded-tl-sm prose-custom">
                    <ReactMarkdown>{streamingMessage}</ReactMarkdown>
                    <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1 align-middle" />
                  </div>
                </motion.div>
              )}
              
              {/* Typing Indicator if streaming but no text yet */}
              {isStreaming && !streamingMessage && (
                <div className="flex max-w-3xl mr-auto items-center text-muted-foreground text-sm">
                  <div className="flex space-x-1 ml-11">
                    <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" />
                    <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} className="h-4" />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-border/50 bg-background shrink-0">
              <form onSubmit={handleSendMessage} className="relative max-w-4xl mx-auto flex items-end gap-2">
                <div className="relative flex-1">
                  <textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    placeholder={`Message ${activeAgent?.name}...`}
                    className="w-full bg-card/50 border border-border rounded-xl pl-4 pr-12 py-4 text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 resize-none max-h-32 min-h-[56px] shadow-inner"
                    rows={1}
                  />
                  <div className="absolute right-3 bottom-3 flex items-center pointer-events-none text-muted-foreground text-xs font-mono opacity-50">
                    <CornerDownLeft className="w-3 h-3 mr-1" /> Enter
                  </div>
                </div>
                <Button 
                  type="submit" 
                  disabled={!messageInput.trim() || isStreaming}
                  size="icon"
                  className="h-[56px] w-[56px] rounded-xl shrink-0"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
