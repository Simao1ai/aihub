import { useState } from 'react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Play, Check, X, Clock, Settings2, ShieldAlert } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  useListAutomations, 
  useListAutomationRuns,
  useRunAutomation,
  useUpdateAutomation,
  useApproveAutomationRun,
  useDiscardAutomationRun,
  getListAutomationsQueryKey,
  getListAutomationRunsQueryKey
} from '@workspace/api-client-react';
import { Button, Card, Badge, Switch, Modal, cn } from '@/components/ui-elements';

export default function Automations() {
  const queryClient = useQueryClient();
  const { data: automations = [] } = useListAutomations();
  const { data: pendingRuns = [] } = useListAutomationRuns({ status: 'pending_approval' });

  const runMutation = useRunAutomation();
  const updateMutation = useUpdateAutomation();
  const approveMutation = useApproveAutomationRun();
  const discardMutation = useDiscardAutomationRun();

  const [viewOutputRun, setViewOutputRun] = useState<any>(null);

  const handleRun = (id: number) => {
    runMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAutomationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListAutomationRunsQueryKey({ status: 'pending_approval' }) });
      }
    });
  };

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

  return (
    <div className="h-full overflow-y-auto p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-display font-bold text-white flex items-center gap-3">
          <Zap className="text-accent w-8 h-8" />
          Automations
        </h2>
        <p className="text-muted-foreground mt-1">Scheduled tasks and triggered workflows requiring your approval.</p>
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
                          Drafted by {run.agentName} • {format(new Date(run.ranAt), 'MMM d, h:mm a')}
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
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6 font-mono bg-black/20 p-2 rounded-lg border border-border/50">
              <Clock className="w-3.5 h-3.5" />
              {auto.scheduleCron || 'On-demand only'}
            </div>
            
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
    </div>
  );
}
