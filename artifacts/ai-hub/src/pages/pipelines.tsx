import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GitFork, Plus, Play, Check, X, ShieldAlert, Trash2, 
  ArrowDown, ChevronDown, ChevronRight, Loader2
} from 'lucide-react';
import { useListAgents } from '@workspace/api-client-react';
import { Button, Card, Badge, Modal, Input, Switch, cn } from '@/components/ui-elements';

// ─── Types ─────────────────────────────────────────────────────────────────

interface PipelineStep {
  stepName: string;
  agentId: number;
  promptTemplate: string;
}

interface StepOutput {
  stepIndex: number;
  stepName: string;
  agentId: number;
  agentName: string;
  agentIcon: string;
  agentColor: string;
  input: string;
  output: string;
}

interface Pipeline {
  id: number;
  name: string;
  description: string | null;
  steps: PipelineStep[];
  isActive: boolean;
  status: string;
  lastOutput: string | null;
  lastRanAt: string | null;
  createdAt: string;
}

interface PipelineRun {
  id: number;
  pipelineId: number;
  pipelineName?: string;
  status: string;
  stepsOutput: StepOutput[];
  finalOutput: string | null;
  ranAt: string;
}

// ─── API helpers ────────────────────────────────────────────────────────────

const api = {
  getPipelines: () => fetch('/api/pipelines').then(r => r.json()),
  createPipeline: (body: object) => fetch('/api/pipelines', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
  updatePipeline: (id: number, body: object) => fetch(`/api/pipelines/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
  deletePipeline: (id: number) => fetch(`/api/pipelines/${id}`, { method: 'DELETE' }),
  runPipeline: (id: number) => fetch(`/api/pipelines/${id}/run`, { method: 'POST' }).then(r => r.json()),
  getPendingRuns: () => fetch('/api/pipelines/runs/list?status=pending_approval').then(r => r.json()),
  approveRun: (id: number) => fetch(`/api/pipelines/runs/${id}/approve`, { method: 'POST' }).then(r => r.json()),
  discardRun: (id: number) => fetch(`/api/pipelines/runs/${id}/discard`, { method: 'POST' }).then(r => r.json()),
};

// ─── Step Output Viewer ─────────────────────────────────────────────────────

function StepOutputCard({ step, isLast }: { step: StepOutput; isLast: boolean }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="relative">
      <div className="border border-border/60 rounded-xl overflow-hidden">
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full flex items-center gap-3 px-4 py-3 bg-card/50 hover:bg-card/80 transition-colors text-left"
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
            style={{ backgroundColor: `${step.agentColor}20`, color: step.agentColor }}
          >
            {step.agentIcon}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Step {step.stepIndex + 1}: {step.stepName}</p>
            <p className="text-xs text-muted-foreground">{step.agentName}</p>
          </div>
          {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </button>
        {expanded && (
          <div className="p-4 border-t border-border/50 bg-[#0d0f15]">
            <p className="text-xs font-mono text-white/80 whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed">
              {step.output}
            </p>
          </div>
        )}
      </div>
      {!isLast && (
        <div className="flex justify-center py-2">
          <ArrowDown className="w-4 h-4 text-primary/50" />
        </div>
      )}
    </div>
  );
}

// ─── Create / Edit Modal ────────────────────────────────────────────────────

function PipelineBuilderModal({
  isOpen, onClose, onSave, agents, initial
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; description: string; steps: PipelineStep[] }) => Promise<void>;
  agents: Array<{ id: number; name: string; icon: string; color: string }>;
  initial?: Pipeline | null;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [steps, setSteps] = useState<PipelineStep[]>(
    initial?.steps?.length ? initial.steps : [{ stepName: '', agentId: agents[0]?.id || 0, promptTemplate: '' }]
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(initial?.name || '');
      setDescription(initial?.description || '');
      setSteps(initial?.steps?.length ? initial.steps : [{ stepName: '', agentId: agents[0]?.id || 0, promptTemplate: '' }]);
    }
  }, [isOpen, initial, agents]);

  const addStep = () => setSteps(s => [...s, { stepName: '', agentId: agents[0]?.id || 0, promptTemplate: '' }]);
  const removeStep = (i: number) => setSteps(s => s.filter((_, idx) => idx !== i));
  const updateStep = (i: number, field: keyof PipelineStep, value: string | number) =>
    setSteps(s => s.map((step, idx) => idx === i ? { ...step, [field]: value } : step));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || steps.some(s => !s.stepName || !s.promptTemplate || !s.agentId)) return;
    setSaving(true);
    try { await onSave({ name, description, steps }); }
    finally { setSaving(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initial ? 'Edit Pipeline' : 'New Pipeline'}>
      <form onSubmit={handleSubmit} className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">Pipeline Name</label>
            <Input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Lead Research & Outreach" />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this pipeline do?" />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-white/80">Steps <span className="text-muted-foreground">({steps.length})</span></label>
            <button type="button" onClick={addStep} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Add Step
            </button>
          </div>

          <div className="space-y-3">
            {steps.map((step, i) => {
              const agent = agents.find(a => a.id === step.agentId);
              return (
                <div key={i} className="relative">
                  <div className="border border-border/60 rounded-xl p-4 bg-black/20 space-y-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0"
                        style={{ backgroundColor: `${agent?.color || '#6366f1'}20`, color: agent?.color || '#6366f1' }}
                      >
                        {agent?.icon || '🤖'}
                      </div>
                      <span className="text-xs font-semibold text-primary">Step {i + 1}</span>
                      {steps.length > 1 && (
                        <button type="button" onClick={() => removeStep(i)} className="ml-auto p-1 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Step Name</label>
                        <Input
                          required
                          value={step.stepName}
                          onChange={e => updateStep(i, 'stepName', e.target.value)}
                          placeholder="e.g., Research Lead"
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Agent</label>
                        <select
                          required
                          value={step.agentId}
                          onChange={e => updateStep(i, 'agentId', Number(e.target.value))}
                          className="w-full bg-card/50 border border-border rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:outline-none"
                        >
                          {agents.map(a => (
                            <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">
                        Prompt {i > 0 && <span className="text-primary/70">(previous step output is automatically included)</span>}
                      </label>
                      <textarea
                        required
                        value={step.promptTemplate}
                        onChange={e => updateStep(i, 'promptTemplate', e.target.value)}
                        rows={3}
                        className="w-full bg-black/20 border border-border rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 resize-none focus:outline-none"
                        placeholder={i === 0 ? "What should this agent do first?" : "What should this agent do with the previous step's output?"}
                      />
                    </div>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="flex justify-center py-1.5">
                      <ArrowDown className="w-4 h-4 text-primary/40" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-2 flex justify-end gap-3 sticky bottom-0 bg-transparent">
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={saving}>
            {initial ? 'Save Changes' : `Create Pipeline (${steps.length} step${steps.length !== 1 ? 's' : ''})`}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function Pipelines() {
  const { data: agents = [] } = useListAgents();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [pendingRuns, setPendingRuns] = useState<PipelineRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningIds, setRunningIds] = useState<Set<number>>(new Set());

  const [createOpen, setCreateOpen] = useState(false);
  const [editPipeline, setEditPipeline] = useState<Pipeline | null>(null);
  const [reviewRun, setReviewRun] = useState<PipelineRun | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [pl, runs] = await Promise.all([api.getPipelines(), api.getPendingRuns()]);
      setPipelines(Array.isArray(pl) ? pl : []);
      setPendingRuns(Array.isArray(runs) ? runs : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Poll pending every 30s
  useEffect(() => {
    const t = setInterval(() => api.getPendingRuns().then(r => setPendingRuns(Array.isArray(r) ? r : [])), 30_000);
    return () => clearInterval(t);
  }, []);

  const handleCreate = async (data: { name: string; description: string; steps: PipelineStep[] }) => {
    await api.createPipeline(data);
    setCreateOpen(false);
    refresh();
  };

  const handleEdit = async (data: { name: string; description: string; steps: PipelineStep[] }) => {
    if (!editPipeline) return;
    await api.updatePipeline(editPipeline.id, data);
    setEditPipeline(null);
    refresh();
  };

  const handleToggle = async (pipeline: Pipeline) => {
    await api.updatePipeline(pipeline.id, { isActive: !pipeline.isActive });
    refresh();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this pipeline? This cannot be undone.')) return;
    await api.deletePipeline(id);
    refresh();
  };

  const handleRun = async (id: number) => {
    setRunningIds(s => new Set(s).add(id));
    try {
      await api.runPipeline(id);
      await refresh();
    } finally {
      setRunningIds(s => { const n = new Set(s); n.delete(id); return n; });
    }
  };

  const handleApprove = async (runId: number) => {
    await api.approveRun(runId);
    setReviewRun(null);
    refresh();
  };

  const handleDiscard = async (runId: number) => {
    await api.discardRun(runId);
    setReviewRun(null);
    refresh();
  };

  const agentById = (id: number) => agents.find(a => a.id === id);

  return (
    <div className="h-full overflow-y-auto p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-3xl font-display font-bold text-white flex items-center gap-3">
            <GitFork className="text-primary w-8 h-8" />
            Pipelines
          </h2>
          <p className="text-muted-foreground mt-1">Chain multiple agents in sequence — each one builds on the last.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="shrink-0">
          <Plus className="w-4 h-4 mr-2" /> New Pipeline
        </Button>
      </div>

      {/* Pending Approvals */}
      <AnimatePresence>
        {pendingRuns.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-10">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4 text-amber-400 font-semibold">
                <ShieldAlert className="w-5 h-5" />
                <h3>Action Required: Pending Pipeline Outputs ({pendingRuns.length})</h3>
              </div>
              <div className="space-y-3">
                {pendingRuns.map(run => {
                  const pipeline = pipelines.find(p => p.id === run.pipelineId);
                  return (
                    <Card key={run.id} className="p-4 bg-[#1a1512] border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex -space-x-2">
                          {(run.stepsOutput || []).slice(0, 4).map((s, i) => (
                            <div key={i} className="w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 border-[#1a1512]" style={{ backgroundColor: `${s.agentColor}20`, color: s.agentColor }}>
                              {s.agentIcon}
                            </div>
                          ))}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white/90">{pipeline?.name || 'Pipeline'}</p>
                          <p className="text-xs text-muted-foreground">{(run.stepsOutput || []).length} steps · {format(new Date(run.ranAt), 'MMM d, h:mm a')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <Button variant="outline" size="sm" onClick={() => setReviewRun(run)}>Review Steps</Button>
                        <Button variant="primary" size="sm" onClick={() => handleApprove(run.id)} className="bg-emerald-600 hover:bg-emerald-500 border-emerald-500">
                          <Check className="w-4 h-4 mr-1" /> Approve
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDiscard(run.id)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pipeline Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2].map(i => <div key={i} className="h-48 bg-card/30 rounded-2xl animate-pulse" />)}
        </div>
      ) : pipelines.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border-2 border-dashed border-border rounded-2xl bg-card/10">
          <GitFork className="w-12 h-12 mb-4 opacity-40" />
          <p className="text-lg font-medium text-white/60">No pipelines yet</p>
          <p className="text-sm mt-1 mb-6">Create one to chain agents together in sequence</p>
          <Button onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4 mr-2" /> Create Pipeline</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pipelines.map(pipeline => {
            const isRunning = runningIds.has(pipeline.id) || pipeline.status === 'running';
            return (
              <Card key={pipeline.id} className={cn("p-6 flex flex-col transition-all duration-300 group", !pipeline.isActive && "opacity-60 grayscale-[0.4]")}>
                <div className="flex justify-between items-start mb-4">
                  {/* Step Agent Avatars */}
                  <div className="flex -space-x-2">
                    {pipeline.steps.slice(0, 5).map((step, i) => {
                      const a = agentById(step.agentId);
                      return (
                        <div key={i} className="w-9 h-9 rounded-full flex items-center justify-center text-base border-2 border-card" style={{ backgroundColor: `${a?.color || '#6366f1'}20`, color: a?.color || '#6366f1' }}>
                          {a?.icon || '🤖'}
                        </div>
                      );
                    })}
                    {pipeline.steps.length > 5 && (
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold bg-white/10 text-white border-2 border-card">
                        +{pipeline.steps.length - 5}
                      </div>
                    )}
                  </div>
                  <Switch checked={pipeline.isActive} onChange={() => handleToggle(pipeline)} />
                </div>

                <h4 className="text-lg font-bold text-white mb-1">{pipeline.name}</h4>
                {pipeline.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{pipeline.description}</p>
                )}

                {/* Step names chain */}
                <div className="flex flex-wrap items-center gap-1 mb-4">
                  {pipeline.steps.map((step, i) => (
                    <span key={i} className="flex items-center gap-1">
                      <span className="text-xs bg-white/5 border border-border/50 px-2 py-0.5 rounded-full text-white/70">{step.stepName || `Step ${i + 1}`}</span>
                      {i < pipeline.steps.length - 1 && <ArrowDown className="w-3 h-3 text-primary/40 rotate-[-90deg]" />}
                    </span>
                  ))}
                </div>

                <div className="mt-auto pt-4 border-t border-border/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={pipeline.status === 'running' || isRunning ? 'warning' : 'default'} className="uppercase">
                      {isRunning ? 'running' : pipeline.status}
                    </Badge>
                    {pipeline.lastRanAt && (
                      <span className="text-xs text-muted-foreground">{format(new Date(pipeline.lastRanAt), 'MMM d')}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditPipeline(pipeline)} className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-white/5 transition-colors text-xs">Edit</button>
                    <button onClick={() => handleDelete(pipeline.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <Button variant="secondary" size="sm" onClick={() => handleRun(pipeline.id)} disabled={isRunning}>
                      {isRunning
                        ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Running…</>
                        : <><Play className="w-4 h-4 mr-1.5 text-primary" /> Run</>
                      }
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}

          {/* Add card */}
          <button
            onClick={() => setCreateOpen(true)}
            className="rounded-2xl border-2 border-dashed border-border hover:border-primary/40 bg-transparent hover:bg-primary/5 transition-all p-6 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-white group min-h-[200px]"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
              <Plus className="w-6 h-6 text-primary" />
            </div>
            <span className="text-sm font-medium">New Pipeline</span>
          </button>
        </div>
      )}

      {/* Create Modal */}
      <PipelineBuilderModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={handleCreate}
        agents={agents}
      />

      {/* Edit Modal */}
      <PipelineBuilderModal
        isOpen={!!editPipeline}
        onClose={() => setEditPipeline(null)}
        onSave={handleEdit}
        agents={agents}
        initial={editPipeline}
      />

      {/* Review Run Modal */}
      <Modal isOpen={!!reviewRun} onClose={() => setReviewRun(null)} title="Pipeline Output Review">
        {reviewRun && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {(reviewRun.stepsOutput || []).length} agents completed · Ran {format(new Date(reviewRun.ranAt), 'MMM d, h:mm a')}
            </p>

            <div className="max-h-[55vh] overflow-y-auto pr-1 space-y-0">
              {(reviewRun.stepsOutput || []).map((step, i) => (
                <StepOutputCard key={i} step={step} isLast={i === (reviewRun.stepsOutput || []).length - 1} />
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-border/50">
              <Button variant="destructive" onClick={() => handleDiscard(reviewRun.id)}>
                <X className="w-4 h-4 mr-2" /> Discard
              </Button>
              <Button variant="primary" className="bg-emerald-600 hover:bg-emerald-500 border-emerald-500" onClick={() => handleApprove(reviewRun.id)}>
                <Check className="w-4 h-4 mr-2" /> Approve Pipeline
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
