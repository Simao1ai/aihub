import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { format } from 'date-fns';
import {
  Bot, Brain, Zap, Link2, ShieldAlert, CheckCircle2,
  ArrowRight, Activity, TrendingUp, Clock
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
import { Button, Card, Badge, cn } from '@/components/ui-elements';
import { Check, X } from 'lucide-react';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { businessTag } = useAppStore();
  const queryClient = useQueryClient();

  const { data: agents = [] } = useListAgents();
  const { data: pendingRuns = [], isLoading: pendingLoading } = useListAutomationRuns(
    { status: 'pending_approval' },
    { query: { refetchInterval: 30_000 } }
  );
  const { data: connections = [] } = useListConnections();
  const { data: brainDocs = [] } = useListBrainDocuments({ businessTag });
  const { data: conversations = [] } = useListAnthropicConversations({});

  const approveMutation = useApproveAutomationRun();
  const discardMutation = useDiscardAutomationRun();

  const connectedCount = connections.length;
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

  const stats = [
    { label: 'AI Agents', value: agents.length, icon: Bot, color: '#6366f1', href: '/agents' },
    { label: 'Brain Documents', value: brainDocs.length, icon: Brain, color: '#8b5cf6', href: '/brain' },
    { label: 'Connected Platforms', value: connectedCount, icon: Link2, color: '#10b981', href: '/connections' },
    { label: 'Pending Approvals', value: pendingRuns.length, icon: ShieldAlert, color: pendingRuns.length > 0 ? '#f59e0b' : '#6b7280', href: '/automations' },
  ];

  return (
    <div className="h-full overflow-y-auto p-6 max-w-7xl mx-auto">
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">

        {/* Header */}
        <motion.div variants={item}>
          <h2 className="text-3xl font-display font-bold text-white flex items-center gap-3">
            <Activity className="text-primary w-8 h-8" />
            Command Center
          </h2>
          <p className="text-muted-foreground mt-1">
            {format(new Date(), "EEEE, MMMM d, yyyy")} — Overview of your AI Hub activity
          </p>
        </motion.div>

        {/* Stat Cards */}
        <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <button
                key={stat.label}
                onClick={() => setLocation(stat.href)}
                className="text-left group"
              >
                <Card className={cn(
                  "p-5 flex flex-col gap-3 transition-all duration-300 hover:border-white/20 cursor-pointer group-hover:scale-[1.02]",
                  stat.label === 'Pending Approvals' && stat.value > 0 && "border-amber-500/30 bg-amber-500/5"
                )}>
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${stat.color}20`, color: stat.color }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-3xl font-display font-bold text-white">{stat.value}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{stat.label}</p>
                  </div>
                </Card>
              </button>
            );
          })}
        </motion.div>

        {/* Pending Approvals */}
        {pendingRuns.length > 0 && (
          <motion.div variants={item}>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-amber-400 font-semibold">
                  <ShieldAlert className="w-5 h-5" />
                  <h3>Action Required ({pendingRuns.length} pending)</h3>
                </div>
                <button
                  onClick={() => setLocation('/automations')}
                  className="text-xs text-amber-400/70 hover:text-amber-400 flex items-center gap-1 transition-colors"
                >
                  View all <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-3">
                {pendingRuns.slice(0, 3).map((run) => (
                  <div key={run.id} className="bg-black/20 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-amber-500/10">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0"
                        style={{ backgroundColor: `${run.agentColor}20`, color: run.agentColor }}
                      >
                        {run.agentIcon}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white/90">{run.automationName}</p>
                        <p className="text-xs text-muted-foreground">
                          {run.agentName} · {format(new Date(run.ranAt), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="primary" size="sm" className="bg-emerald-600 hover:bg-emerald-500 border-emerald-500" onClick={() => handleApprove(run.id)}>
                        <Check className="w-3.5 h-3.5 mr-1" /> Approve
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDiscard(run.id)}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Agents Grid */}
          <motion.div variants={item}>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-display font-semibold text-white flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary" /> Your Agents
                </h3>
                <button
                  onClick={() => setLocation('/agents')}
                  className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                >
                  Open <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {agents.map(agent => (
                  <button
                    key={agent.id}
                    onClick={() => setLocation('/agents')}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl bg-black/20 hover:bg-white/5 border border-transparent hover:border-white/10 transition-all group"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                      style={{ backgroundColor: `${agent.color}20`, color: agent.color }}
                    >
                      {agent.icon}
                    </div>
                    <span className="text-xs font-medium text-white/70 group-hover:text-white truncate w-full text-center">{agent.name}</span>
                  </button>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Recent Conversations */}
          <motion.div variants={item}>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-display font-semibold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" /> Recent Sessions
                </h3>
                <button
                  onClick={() => setLocation('/agents')}
                  className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                >
                  View all <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              {recentConvs.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8">
                  No sessions yet. Start a conversation with an agent.
                </div>
              ) : (
                <div className="space-y-2">
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
                            style={{ backgroundColor: `${agent.color}20`, color: agent.color }}
                          >
                            {agent.icon}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white/80 group-hover:text-white truncate">{conv.title}</p>
                          <p className="text-xs text-muted-foreground">{agent?.name} · {format(new Date(conv.createdAt), 'MMM d')}</p>
                        </div>
                        <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          </motion.div>

          {/* Connections Status */}
          <motion.div variants={item} className="lg:col-span-2">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-display font-semibold text-white flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-primary" /> Platform Connections
                </h3>
                <button
                  onClick={() => setLocation('/connections')}
                  className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                >
                  Manage <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                {(['linkedin', 'google', 'twitter', 'meta', 'gohighlevel', 'email'] as const).map(plat => {
                  const conn = connections.find(c => c.platform === plat);
                  const labels: Record<string, string> = {
                    linkedin: 'LinkedIn', google: 'Gmail', twitter: 'Twitter/X',
                    meta: 'Meta', gohighlevel: 'GoHighLevel', email: 'Email'
                  };
                  return (
                    <button
                      key={plat}
                      onClick={() => setLocation('/connections')}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all",
                        conn
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          : "bg-black/20 border-border text-muted-foreground hover:text-white hover:border-white/20"
                      )}
                    >
                      {conn
                        ? <CheckCircle2 className="w-3.5 h-3.5" />
                        : <div className="w-2 h-2 rounded-full bg-current opacity-40" />
                      }
                      {labels[plat]}
                    </button>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
