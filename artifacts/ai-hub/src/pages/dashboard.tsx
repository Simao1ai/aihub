import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { format } from 'date-fns';
import {
  Bot, Brain, Zap, Link2, ShieldAlert, CheckCircle2,
  ArrowRight, Clock, Sparkles, GitFork
} from 'lucide-react';
import {
  useListAgents,
  useListAutomationRuns,
  useListConnections,
  useListBrainDocuments,
  useListAnthropicConversations,
  useApproveAutomationRun,
  useDiscardAutomationRun,
  getListAutomationRunsQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store';
import { cn } from '@/components/ui-elements';
import { Check, X } from 'lucide-react';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { businessTag } = useAppStore();
  const queryClient = useQueryClient();

  const { data: agents = [] } = useListAgents();
  const { data: pendingRuns = [] } = useListAutomationRuns(
    { status: 'pending_approval' },
    { query: { refetchInterval: 30_000 } }
  );
  const { data: connections = [] } = useListConnections();
  const { data: brainDocs = [] } = useListBrainDocuments({ businessTag });
  const { data: conversations = [] } = useListAnthropicConversations({});

  const approveMutation = useApproveAutomationRun();
  const discardMutation = useDiscardAutomationRun();

  const recentConvs = [...conversations]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const handleApprove = (id: number) => {
    approveMutation.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListAutomationRunsQueryKey({ status: 'pending_approval' }) })
    });
  };
  const handleDiscard = (id: number) => {
    discardMutation.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListAutomationRunsQueryKey({ status: 'pending_approval' }) })
    });
  };

  const { account } = useAppStore();
  const hour = new Date().getHours();
  const timeGreet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const greeting = account?.displayName ? `${timeGreet}, ${account.displayName}` : timeGreet;

  const stats = [
    { label: 'AI Agents', value: agents.length, icon: Bot, color: '#6366f1', href: '/agents', bg: '#6366f115' },
    { label: 'Brain Docs', value: brainDocs.length, icon: Brain, color: '#8b5cf6', href: '/brain', bg: '#8b5cf615' },
    { label: 'Connected', value: connections.length, icon: Link2, color: '#10b981', href: '/connections', bg: '#10b98115' },
    { label: 'Awaiting Review', value: pendingRuns.length, icon: ShieldAlert, color: pendingRuns.length > 0 ? '#f59e0b' : '#6b7280', href: '/automations', bg: pendingRuns.length > 0 ? '#f59e0b15' : '#6b728015' },
  ];

  return (
    <div className="h-full overflow-y-auto">
      {/* Top header */}
      <div className="sticky top-0 z-10 px-8 pt-8 pb-5 bg-[#0c0e16]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">{greeting} 👋</h1>
            <p className="text-sm text-white/35 mt-0.5">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
          </div>
          <button
            onClick={() => setLocation('/agents')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/90 hover:bg-primary text-white text-sm font-semibold transition-all shadow-lg shadow-primary/20"
          >
            <Sparkles className="w-4 h-4" /> New chat
          </button>
        </div>
      </div>

      <div className="px-8 py-8 max-w-5xl mx-auto">
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">

          {/* Stats row */}
          <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <button
                  key={stat.label}
                  onClick={() => setLocation(stat.href)}
                  className="text-left p-4 rounded-2xl border border-white/5 bg-[#111520] hover:bg-[#141824] hover:border-white/10 transition-all group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: stat.bg, color: stat.color }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-white/15 group-hover:text-white/40 transition-colors" />
                  </div>
                  <p className="text-2xl font-display font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-white/35 mt-0.5">{stat.label}</p>
                </button>
              );
            })}
          </motion.div>

          {/* Pending Approvals banner */}
          {pendingRuns.length > 0 && (
            <motion.div variants={item} className="rounded-2xl border border-amber-500/20 bg-amber-500/8 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                  <ShieldAlert className="w-4 h-4" />
                  {pendingRuns.length} item{pendingRuns.length > 1 ? 's' : ''} need your review
                </div>
                <button
                  onClick={() => setLocation('/automations')}
                  className="text-xs text-amber-400/60 hover:text-amber-400 flex items-center gap-1 transition-colors"
                >
                  See all <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-2.5">
                {pendingRuns.slice(0, 3).map((run) => (
                  <div key={run.id} className="flex items-center justify-between gap-3 bg-black/20 rounded-xl px-4 py-3 border border-white/5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
                        style={{ background: `${run.agentColor}20` }}
                      >
                        {run.agentIcon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{run.automationName}</p>
                        <p className="text-xs text-white/35">{run.agentName} · {format(new Date(run.ranAt), 'MMM d, h:mm a')}</p>
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => handleApprove(run.id)}
                        className="w-8 h-8 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 flex items-center justify-center transition-all"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDiscard(run.id)}
                        className="w-8 h-8 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 flex items-center justify-center transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            {/* Agent shortcuts */}
            <motion.div variants={item} className="lg:col-span-3 rounded-2xl border border-white/5 bg-[#111520] p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-display font-semibold text-white flex items-center gap-2 text-sm">
                  <Bot className="w-4 h-4 text-primary" /> Your AI Team
                </h3>
                <button
                  onClick={() => setLocation('/agents')}
                  className="text-xs text-white/30 hover:text-primary flex items-center gap-1 transition-colors"
                >
                  Open <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {agents.map(agent => (
                  <button
                    key={agent.id}
                    onClick={() => setLocation('/agents')}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/3 hover:bg-white/6 border border-white/5 hover:border-white/10 transition-all group"
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl"
                      style={{ background: `${agent.color}18` }}
                    >
                      {agent.icon}
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-semibold text-white/70 group-hover:text-white truncate w-full">{agent.name}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Recent sessions */}
            <motion.div variants={item} className="lg:col-span-2 rounded-2xl border border-white/5 bg-[#111520] p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-display font-semibold text-white flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-primary" /> Recent Chats
                </h3>
                <button
                  onClick={() => setLocation('/agents')}
                  className="text-xs text-white/30 hover:text-primary flex items-center gap-1 transition-colors"
                >
                  All <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              {recentConvs.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-10 text-white/20">
                  <Sparkles className="w-8 h-8 mb-3 opacity-30" />
                  <p className="text-xs">No chats yet — start by talking to an agent</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {recentConvs.map(conv => {
                    const agent = agents.find(a => a.id === conv.agentId);
                    return (
                      <button
                        key={conv.id}
                        onClick={() => setLocation('/agents')}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-left group"
                      >
                        {agent && (
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0"
                            style={{ background: `${agent.color}18` }}
                          >
                            {agent.icon}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white/70 group-hover:text-white truncate font-medium">{conv.title}</p>
                          <p className="text-[10px] text-white/25">{agent?.name} · {format(new Date(conv.createdAt), 'MMM d')}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>

          {/* Quick actions */}
          <motion.div variants={item} className="grid grid-cols-3 gap-3">
            {[
              { label: 'Brain', sub: 'Knowledge base', icon: Brain, color: '#8b5cf6', href: '/brain' },
              { label: 'Automations', sub: 'Scheduled tasks', icon: Zap, color: '#f59e0b', href: '/automations' },
              { label: 'Pipelines', sub: 'Multi-step workflows', icon: GitFork, color: '#3b82f6', href: '/pipelines' },
            ].map(q => {
              const Icon = q.icon;
              return (
                <button
                  key={q.href}
                  onClick={() => setLocation(q.href)}
                  className="flex items-center gap-3.5 p-4 rounded-2xl border border-white/5 bg-[#111520] hover:bg-[#141824] hover:border-white/10 transition-all group text-left"
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${q.color}18`, color: q.color }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white/80 group-hover:text-white">{q.label}</p>
                    <p className="text-xs text-white/30">{q.sub}</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-white/10 group-hover:text-white/30 ml-auto transition-colors" />
                </button>
              );
            })}
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}
