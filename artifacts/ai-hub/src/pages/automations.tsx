import { useState } from 'react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Play, Check, X, Clock, Settings2, ShieldAlert, Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  useListAutomations,
  useListAutomationRuns,
  useRunAutomation,
  useUpdateAutomation,
  useCreateAutomation,
  useApproveAutomationRun,
  useDiscardAutomationRun,
  useListAgents,
  getListAutomationsQueryKey,
  getListAutomationRunsQueryKey
} from '@workspace/api-client-react';
import { Button, Card, Badge, Switch, Modal, Input, cn } from '@/components/ui-elements';
import { cronToHuman } from '@/lib/cron-utils';

export default function Automations() {
  const queryClient = useQueryClient();
  const { data: automations = [] } = useListAutomations();
  const { data: pendingRuns = [] } = useListAutomationRuns(
    { status: 'pending_approval' },
    { query: { refetchInterval: 30_000 } }
  );
  const { data: agents = [] } = useListAgents();

  const runMutation = useRunAutomation();
  const updateMutation = useUpdateAutomation();
  const createMutation = useCreateAutomation();
  const approveMutation = useApproveAutomationRun();
  const discardMutation = useDiscardAutomationRun();

  const [viewOutputRun, setViewOutputRun] = useState<any>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Create form state
  const [newName, setNewName] = useState('');
  const [newAgentId, setNewAgentId] = useState<number | ''>('');
  const [newCron, setNewCron] = useState('');
  const [newPrompt, setNewPrompt] = useState('');

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getListAutomationsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListAutomationRunsQueryKey({ status: 'pending_approval' }) });
  };

  const handleRun = (id: number) => runMutation.mutate({ id }, { onSuccess: invalidateAll });

  const handleToggle = (id: number, current: boolean) => {
    updateMutation.mutate({ id, data: { isActive: !current } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListAutomationsQueryKey() })
    });
  };

  const handleApprove = (id: number) => {
    approveMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAutomationRunsQueryKey({ status: 'pending_approval' }) });
        setViewOutputRun(null);
      }
    });
  };

  const handleDiscard = (id: number) => {
    discardMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAutomationRunsQueryKey({ status: 'pending_approval' }) });
        setViewOutputRun(null);
      }
    });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newAgentId || !newPrompt) return;
    createMutation.mutate({
      data: {
        name: newName,
        agentId: newAgentId as number,
        scheduleCron: newCron || undefined,
        promptTemplate: newPrompt,
        isActive: true,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAutomationsQueryKey() });
        setCreateModalOpen(false);
        setNewName(''); setNewAgentId(''); setNewCron(''); setNewPrompt('');
      }
    });
  };

  return (
    <div className="h-full overflow-y-auto p-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-3xl font-display font-bold text-white flex items-center gap-3">
            <Zap className="text-accent w-8 h-8" />
            Automations
          </h2>
          <p className="text-muted-foreground mt-1">Scheduled tasks and triggered workflows requiring your approval.</p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)} className="shrink-0">
          <Plus className="w-4 h-4 mr-2" /> New Automation
        </Button>
      </div>

      {/* Pending Queue */}
      <AnimatePresence>
        {pendingRuns.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }} 
            exit={{ opacity: 0, height: 0 }}
            className="mb-10"
          >
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4 text-amber-400 font-semibold">
                <ShieldAlert className="w-5 h-5" />
                <h3>Action Required: Pending Approvals ({pendingRuns.length})</h3>
              </div>
              
              <div className="space-y-3">
                {pendingRuns.map(run => (
                  <Card key={run.id} className="p-4 bg-[#1a1512] border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-inner shrink-0"
                        style={{ backgroundColor: `${run.agentColor}20`, color: run.agentColor }}
                      >
                        {run.agentIcon}
                      </div>
                      <div>
                        <h4 className="font-semibold text-white/90">{run.automationName}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Drafted by {run.agentName} · {format(new Date(run.ranAt), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <Button variant="outline" size="sm" onClick={() => setViewOutputRun(run)}>Review Output</Button>
                      <Button variant="primary" size="sm" onClick={() => handleApprove(run.id)} className="bg-emerald-600 hover:bg-emerald-500 border-emerald-500">
                        <Check className="w-4 h-4 mr-1" /> Approve
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDiscard(run.id)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Automations Grid */}
      <h3 className="text-lg font-display font-semibold text-white mb-4 flex items-center gap-2">
        <Settings2 className="w-5 h-5 text-muted-foreground" /> Workflows
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {automations.map(auto => (
          <Card key={auto.id} className={cn("p-6 flex flex-col transition-all duration-300", !auto.isActive && "opacity-60 grayscale-[0.5]")}>
            <div className="flex justify-between items-start mb-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-inner border"
                style={{ backgroundColor: `${auto.agentColor}15`, color: auto.agentColor, borderColor: `${auto.agentColor}30` }}
              >
                {auto.agentIcon}
              </div>
              <Switch checked={auto.isActive} onChange={() => handleToggle(auto.id, auto.isActive)} />
            </div>
            
            <h4 className="text-lg font-bold text-white mb-1">{auto.name}</h4>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1 font-medium">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              {cronToHuman(auto.scheduleCron)}
            </div>
            {auto.scheduleCron && (
              <p className="text-[10px] text-muted-foreground/50 font-mono mb-5 pl-5">{auto.scheduleCron}</p>
            )}
            {!auto.scheduleCron && <div className="mb-5" />}
            
            <div className="mt-auto pt-4 border-t border-border/50 flex items-center justify-between">
              <Badge variant={auto.status === 'running' ? 'warning' : 'default'} className="uppercase">
                {auto.status}
              </Badge>
              
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => handleRun(auto.id)}
                disabled={auto.status === 'running' || runMutation.isPending}
              >
                <Play className="w-4 h-4 mr-1.5 text-primary" /> Run Now
              </Button>
            </div>
          </Card>
        ))}

        {/* Add New Card */}
        <button
          onClick={() => setCreateModalOpen(true)}
          className="rounded-2xl border-2 border-dashed border-border hover:border-primary/40 bg-transparent hover:bg-primary/5 transition-all p-6 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-white group min-h-[200px]"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
            <Plus className="w-6 h-6 text-primary" />
          </div>
          <span className="text-sm font-medium">Create Automation</span>
        </button>
      </div>

      {/* Review Modal */}
      <Modal isOpen={!!viewOutputRun} onClose={() => setViewOutputRun(null)} title="Review Draft">
        {viewOutputRun && (
          <div className="space-y-6">
            <div className="bg-[#0d0f15] border border-border/50 rounded-xl p-4 whitespace-pre-wrap text-sm text-white/90 max-h-[50vh] overflow-y-auto font-mono">
              {viewOutputRun.output || 'No output generated.'}
            </div>
            
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="destructive" onClick={() => handleDiscard(viewOutputRun.id)}>
                <X className="w-4 h-4 mr-2" /> Discard
              </Button>
              <Button variant="primary" className="bg-emerald-600 hover:bg-emerald-500 border-emerald-500" onClick={() => handleApprove(viewOutputRun.id)}>
                <Check className="w-4 h-4 mr-2" /> Approve & Execute
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Automation Modal */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="New Automation">
        <form onSubmit={handleCreateSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">Automation Name</label>
            <Input
              required
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g., Weekly Lead Summary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">Assign Agent</label>
            <select
              required
              value={newAgentId}
              onChange={e => setNewAgentId(Number(e.target.value))}
              className="w-full bg-card/50 border border-border rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:outline-none"
            >
              <option value="">Select an agent...</option>
              {agents.map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.icon} {agent.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">
              Schedule <span className="text-muted-foreground font-normal">(optional — leave blank for on-demand)</span>
            </label>
            <Input
              value={newCron}
              onChange={e => setNewCron(e.target.value)}
              placeholder="e.g., 0 8 * * 1 (every Monday 8am)"
              className="font-mono"
            />
            {newCron && (
              <p className="text-xs text-primary mt-1.5">{cronToHuman(newCron)}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">Prompt Template</label>
            <textarea
              required
              value={newPrompt}
              onChange={e => setNewPrompt(e.target.value)}
              rows={4}
              className="w-full bg-black/20 border border-border rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 resize-none focus:outline-none"
              placeholder="What should the agent do? Be specific about format and goals."
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending}>Create Automation</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
