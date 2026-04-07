import { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  GitFork, Plus, Play, Check, X, ShieldAlert, Trash2,
  ChevronRight, Loader2, Zap, ArrowRight, ChevronDown,
  Copy, CheckCheck, RotateCcw, Building2, Pencil
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

interface Workspace {
  id: number;
  name: string;
  slug: string;
  emoji: string;
  color: string;
}

interface SSEEvent {
  type: 'connected' | 'step_start' | 'step_done' | 'done' | 'error';
  stepIndex?: number;
  stepName?: string;
  agentName?: string;
  agentIcon?: string;
  agentColor?: string;
  totalSteps?: number;
  output?: string;
  message?: string;
  [key: string]: unknown;
}

interface LiveStep {
  stepIndex: number;
  stepName: string;
  agentName: string;
  agentIcon: string;
  agentColor: string;
  status: 'pending' | 'running' | 'done';
  output?: string;
}

// ─── API helpers ────────────────────────────────────────────────────────────

const api = {
  getPipelines: () => fetch('/api/pipelines').then(r => r.json()),
  getWorkspaces: () => fetch('/api/workspaces').then(r => r.json()),
  createPipeline: (body: object) =>
    fetch('/api/pipelines', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
  updatePipeline: (id: number, body: object) =>
    fetch(`/api/pipelines/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
  deletePipeline: (id: number) => fetch(`/api/pipelines/${id}`, { method: 'DELETE' }),
  getPendingRuns: () => fetch('/api/pipelines/runs/list?status=pending_approval').then(r => r.json()),
  approveRun: (id: number) =>
    fetch(`/api/pipelines/runs/${id}/approve`, { method: 'POST' }).then(r => r.json()),
  discardRun: (id: number) =>
    fetch(`/api/pipelines/runs/${id}/discard`, { method: 'POST' }).then(r => r.json()),
};

// ─── Copy Button ────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

// ─── Horizontal Agent Flow ───────────────────────────────────────────────────

function AgentFlow({
  steps,
  agents,
  activeIndex = -1,
  compact = false,
}: {
  steps: PipelineStep[];
  agents: Array<{ id: number; name: string; icon: string; color: string }>;
  activeIndex?: number;
  compact?: boolean;
}) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {steps.map((step, i) => {
        const agent = agents.find(a => a.id === step.agentId);
        const isDone = activeIndex > i;
        const isActive = activeIndex === i;
        return (
          <span key={i} className="flex items-center gap-1">
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-full border transition-all duration-300",
                compact ? "px-2 py-0.5" : "px-2.5 py-1",
                isActive && "border-primary/60 bg-primary/10 shadow-[0_0_12px_rgba(99,102,241,0.3)]",
                isDone && "border-emerald-500/40 bg-emerald-500/10",
                !isActive && !isDone && "border-border/50 bg-white/3"
              )}
              style={isActive ? { borderColor: `${agent?.color || '#6366f1'}60` } : isDone ? {} : undefined}
            >
              <span className={compact ? "text-xs" : "text-sm"}>
                {isDone ? '✅' : agent?.icon || '🤖'}
              </span>
              {!compact && (
                <span className="text-xs font-medium text-white/80 max-w-[60px] truncate">
                  {agent?.name || `#${step.agentId}`}
                </span>
              )}
            </div>
            {i < steps.length - 1 && (
              <ArrowRight className={cn("w-3 h-3 shrink-0", isDone ? "text-emerald-400/60" : "text-white/20")} />
            )}
          </span>
        );
      })}
    </div>
  );
}

// ─── Step Output Card ────────────────────────────────────────────────────────

function StepOutputCard({ step, defaultOpen = false }: { step: StepOutput; defaultOpen?: boolean }) {
  const [expanded, setExpanded] = useState(defaultOpen);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-border/50 rounded-2xl overflow-hidden"
    >
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-card/40 hover:bg-card/70 transition-colors text-left"
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0"
          style={{ backgroundColor: `${step.agentColor}20`, color: step.agentColor }}
        >
          {step.agentIcon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">Step {step.stepIndex + 1}: {step.stepName}</p>
          <p className="text-xs text-muted-foreground">{step.agentName}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <CopyButton text={step.output} />
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 border-t border-border/40 bg-[#0c0e14]">
              <div className="prose prose-invert prose-sm max-w-none max-h-80 overflow-y-auto text-white/80 leading-relaxed">
                <ReactMarkdown>{step.output}</ReactMarkdown>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Launch Modal ────────────────────────────────────────────────────────────

function LaunchModal({
  pipeline,
  workspaces,
  agents,
  onLaunch,
  onClose,
}: {
  pipeline: Pipeline;
  workspaces: Workspace[];
  agents: Array<{ id: number; name: string; icon: string; color: string }>;
  onLaunch: (topic: string, businessTag: string) => void;
  onClose: () => void;
}) {
  const [topic, setTopic] = useState('');
  const [businessTag, setBusinessTag] = useState('general');
  const selectedWs = workspaces.find(w => w.slug === businessTag);

  return (
    <Modal isOpen onClose={onClose} title="Launch Pipeline">
      <div className="space-y-5">
        {/* Pipeline preview */}
        <div className="bg-card/30 border border-border/40 rounded-2xl p-4">
          <p className="text-base font-bold text-white mb-1">{pipeline.name}</p>
          {pipeline.description && (
            <p className="text-xs text-muted-foreground mb-3">{pipeline.description}</p>
          )}
          <AgentFlow steps={pipeline.steps} agents={agents} />
          <p className="text-xs text-muted-foreground mt-2">
            {pipeline.steps.length} agents · ~{pipeline.steps.length * 20}–{pipeline.steps.length * 40}s
          </p>
        </div>

        {/* Topic input */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            What do you want to create?
            <span className="ml-1 text-xs text-muted-foreground font-normal">(your topic or task)</span>
          </label>
          <textarea
            autoFocus
            value={topic}
            onChange={e => setTopic(e.target.value)}
            rows={3}
            placeholder={`e.g., "Promote our 5-star reviews to attract new clients" or "Highlight our fast-turnaround inspection reports"`}
            className="w-full bg-black/30 border border-border rounded-xl p-3 text-sm text-white placeholder:text-white/30 focus:ring-2 focus:ring-primary/50 focus:border-primary/50 resize-none focus:outline-none"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Use <span className="font-mono text-primary/70 bg-primary/10 px-1 rounded">{'{{TOPIC}}'}</span> appears in prompts automatically.
          </p>
        </div>

        {/* Business selector */}
        {workspaces.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Business context</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {workspaces.map(ws => (
                <button
                  key={ws.slug}
                  onClick={() => setBusinessTag(ws.slug)}
                  className={cn(
                    "flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all text-sm",
                    businessTag === ws.slug
                      ? "border-primary/60 bg-primary/10 text-white"
                      : "border-border/40 bg-white/3 text-muted-foreground hover:border-border hover:text-white"
                  )}
                >
                  <span className="text-base shrink-0">{ws.emoji}</span>
                  <span className="font-medium text-xs leading-tight">{ws.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => { if (topic.trim()) onLaunch(topic.trim(), businessTag); }}
            disabled={!topic.trim()}
            className="gap-2"
          >
            <Zap className="w-4 h-4" />
            Launch {pipeline.steps.length}-Step Pipeline
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Live Execution View ─────────────────────────────────────────────────────

function ExecutionView({
  pipeline,
  topic,
  businessTag,
  agents,
  onDone,
  onCancel,
}: {
  pipeline: Pipeline;
  topic: string;
  businessTag: string;
  agents: Array<{ id: number; name: string; icon: string; color: string }>;
  onDone: (run: PipelineRun) => void;
  onCancel: () => void;
}) {
  const [liveSteps, setLiveSteps] = useState<LiveStep[]>(() =>
    pipeline.steps.map((s, i) => ({
      stepIndex: i,
      stepName: s.stepName,
      agentName: agents.find(a => a.id === s.agentId)?.name || `Agent`,
      agentIcon: agents.find(a => a.id === s.agentId)?.icon || '🤖',
      agentColor: agents.find(a => a.id === s.agentId)?.color || '#6366f1',
      status: 'pending',
    }))
  );
  const [activeIndex, setActiveIndex] = useState(-1);
  const [completedSteps, setCompletedSteps] = useState<StepOutput[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const esRef = useRef<EventSource | null>(null);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({ topic, businessTag });
    const url = `/api/pipelines/${pipeline.id}/stream?${params.toString()}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const data: SSEEvent = JSON.parse(e.data);

        if (data.type === 'step_start') {
          const idx = data.stepIndex!;
          setActiveIndex(idx);
          setLiveSteps(prev =>
            prev.map((s, i) => i === idx ? { ...s, status: 'running' } : s)
          );
        } else if (data.type === 'step_done') {
          const idx = data.stepIndex!;
          setLiveSteps(prev =>
            prev.map((s, i) => i === idx ? { ...s, status: 'done' } : s)
          );
          setCompletedSteps(prev => [...prev, data as unknown as StepOutput]);
        } else if (data.type === 'done') {
          const run = data as unknown as PipelineRun;
          es.close();
          onDone(run);
        } else if (data.type === 'error') {
          setError(data.message || 'Pipeline failed');
          es.close();
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      setError('Connection lost. The pipeline may still be running.');
      es.close();
    };

    return () => {
      es.close();
    };
  }, [pipeline.id, topic, businessTag, onDone]);

  const handleCancel = () => {
    esRef.current?.close();
    onCancel();
  };

  const doneCount = liveSteps.filter(s => s.status === 'done').length;
  const progress = pipeline.steps.length > 0 ? (doneCount / pipeline.steps.length) * 100 : 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm text-primary font-medium">Pipeline Running</span>
              <span className="text-xs text-muted-foreground">{elapsed}s</span>
            </div>
            <h2 className="text-2xl font-display font-bold text-white">{pipeline.name}</h2>
            <p className="text-sm text-muted-foreground mt-0.5 italic">"{topic}"</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            <X className="w-4 h-4 mr-1.5" /> Cancel
          </Button>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{doneCount} of {pipeline.steps.length} steps complete</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Agent steps */}
        <div className="space-y-3">
          {liveSteps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0.4 }}
              animate={{ opacity: step.status === 'pending' ? 0.4 : 1 }}
              className={cn(
                "flex items-center gap-3 p-4 rounded-2xl border transition-all duration-500",
                step.status === 'running' && "border-primary/40 bg-primary/5 shadow-[0_0_20px_rgba(99,102,241,0.1)]",
                step.status === 'done' && "border-emerald-500/30 bg-emerald-500/5",
                step.status === 'pending' && "border-border/30 bg-white/2"
              )}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 transition-all",
                  step.status === 'running' && "shadow-lg"
                )}
                style={{
                  backgroundColor: `${step.agentColor}20`,
                  boxShadow: step.status === 'running' ? `0 0 15px ${step.agentColor}40` : undefined,
                }}
              >
                {step.status === 'done' ? '✅' : step.agentIcon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-white">
                    Step {step.stepIndex + 1}: {step.stepName}
                  </p>
                  {step.status === 'running' && (
                    <Badge variant="warning" className="text-xs">Active</Badge>
                  )}
                  {step.status === 'done' && (
                    <Badge variant="success" className="text-xs">Done</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{step.agentName}</p>
                {step.status === 'running' && (
                  <motion.div
                    className="flex items-center gap-1.5 mt-1.5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <Loader2 className="w-3 h-3 text-primary animate-spin" />
                    <span className="text-xs text-primary/70">Thinking…</span>
                  </motion.div>
                )}
              </div>
              <div
                className={cn(
                  "w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                  step.status === 'done' && "border-emerald-400 bg-emerald-400/20",
                  step.status === 'running' && "border-primary bg-primary/10",
                  step.status === 'pending' && "border-white/20 bg-transparent"
                )}
              >
                {step.status === 'done' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                {step.status === 'running' && <Loader2 className="w-3 h-3 text-primary animate-spin" />}
                {step.status === 'pending' && (
                  <span className="text-xs text-white/30 font-mono">{i + 1}</span>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            <p className="font-semibold mb-1">Pipeline Error</p>
            <p>{error}</p>
            <Button variant="ghost" size="sm" className="mt-3" onClick={onCancel}>
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Go Back
            </Button>
          </div>
        )}

        {/* Completed step outputs (live) */}
        {completedSteps.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Step Outputs</h3>
            {completedSteps.map((step, i) => (
              <StepOutputCard key={i} step={step} defaultOpen={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Result View ─────────────────────────────────────────────────────────────

function ResultView({
  run,
  pipeline,
  agents,
  onApprove,
  onDiscard,
  onRunAgain,
}: {
  run: PipelineRun;
  pipeline: Pipeline;
  agents: Array<{ id: number; name: string; icon: string; color: string }>;
  onApprove: () => void;
  onDiscard: () => void;
  onRunAgain: () => void;
}) {
  const [approving, setApproving] = useState(false);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-emerald-400">✅</span>
              <span className="text-sm text-emerald-400 font-medium">Pipeline Complete</span>
            </div>
            <h2 className="text-2xl font-display font-bold text-white">{pipeline.name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {(run.stepsOutput || []).length} agents · {format(new Date(run.ranAt), 'MMM d, h:mm a')}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onRunAgain}>
            <RotateCcw className="w-4 h-4 mr-1.5" /> Run Again
          </Button>
        </div>

        {/* Final Output */}
        <div className="border border-emerald-500/20 rounded-2xl overflow-hidden bg-emerald-500/5">
          <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-500/20">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold text-emerald-300">Final Output</span>
            </div>
            {run.finalOutput && <CopyButton text={run.finalOutput} />}
          </div>
          <div className="p-4">
            <div className="prose prose-invert prose-sm max-w-none text-white/85 leading-relaxed max-h-80 overflow-y-auto">
              <ReactMarkdown>{run.finalOutput || ''}</ReactMarkdown>
            </div>
          </div>
        </div>

        {/* All step outputs */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">All Steps</h3>
          {(run.stepsOutput || []).map((step, i) => (
            <StepOutputCard key={i} step={step} defaultOpen={false} />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2 border-t border-border/50">
          <Button variant="destructive" onClick={onDiscard}>
            <X className="w-4 h-4 mr-2" /> Discard
          </Button>
          <Button
            className="ml-auto bg-emerald-600 hover:bg-emerald-500 border-emerald-500"
            isLoading={approving}
            onClick={async () => {
              setApproving(true);
              try { await onApprove(); }
              finally { setApproving(false); }
            }}
          >
            <Check className="w-4 h-4 mr-2" /> Approve & Save
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Pipeline Builder Modal ──────────────────────────────────────────────────

function PipelineBuilderModal({
  isOpen, onClose, onSave, agents, initial,
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
            <label className="block text-sm font-medium text-white/80 mb-1.5">
              Description <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this pipeline do?" />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-white/80">
              Steps <span className="text-muted-foreground">({steps.length})</span>
            </label>
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
                        Prompt{' '}
                        <span className="text-primary/60 font-mono">{'{{TOPIC}}'}</span>
                        {' '}= your task input
                        {i > 0 && <span className="text-white/40"> · previous step output auto-included</span>}
                      </label>
                      <textarea
                        required
                        value={step.promptTemplate}
                        onChange={e => updateStep(i, 'promptTemplate', e.target.value)}
                        rows={3}
                        className="w-full bg-black/20 border border-border rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 resize-none focus:outline-none"
                        placeholder={i === 0 ? "What should this agent do first? Use {{TOPIC}} for the user's task." : "What should this agent do with the previous step's output?"}
                      />
                    </div>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="flex justify-center py-1.5">
                      <ArrowRight className="w-4 h-4 text-primary/30" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-2 flex justify-end gap-3">
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={saving}>
            {initial ? 'Save Changes' : `Create Pipeline (${steps.length} step${steps.length !== 1 ? 's' : ''})`}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

type PageView =
  | { mode: 'list' }
  | { mode: 'launching'; pipeline: Pipeline }
  | { mode: 'running'; pipeline: Pipeline; topic: string; businessTag: string }
  | { mode: 'result'; pipeline: Pipeline; run: PipelineRun; topic: string };

export default function Pipelines() {
  const { data: agents = [] } = useListAgents();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [pendingRuns, setPendingRuns] = useState<PipelineRun[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<PageView>({ mode: 'list' });
  const [createOpen, setCreateOpen] = useState(false);
  const [editPipeline, setEditPipeline] = useState<Pipeline | null>(null);
  const [reviewRun, setReviewRun] = useState<PipelineRun | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [pl, runs, ws] = await Promise.all([
        api.getPipelines(),
        api.getPendingRuns(),
        api.getWorkspaces(),
      ]);
      setPipelines(Array.isArray(pl) ? pl : []);
      setPendingRuns(Array.isArray(runs) ? runs : []);
      setWorkspaces(Array.isArray(ws) ? ws : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

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

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this pipeline? This cannot be undone.')) return;
    await api.deletePipeline(id);
    refresh();
  };

  const handleApproveRun = async (runId: number) => {
    await api.approveRun(runId);
    setReviewRun(null);
    setView({ mode: 'list' });
    refresh();
  };

  const handleDiscardRun = async (runId: number) => {
    await api.discardRun(runId);
    setReviewRun(null);
    setView({ mode: 'list' });
    refresh();
  };

  // ── Execution view ──────────────────────────────────────────────────────────
  if (view.mode === 'running') {
    return (
      <ExecutionView
        pipeline={view.pipeline}
        topic={view.topic}
        businessTag={view.businessTag}
        agents={agents}
        onDone={(run) => {
          refresh();
          setView({ mode: 'result', pipeline: view.pipeline, run, topic: view.topic });
        }}
        onCancel={() => { refresh(); setView({ mode: 'list' }); }}
      />
    );
  }

  // ── Result view ─────────────────────────────────────────────────────────────
  if (view.mode === 'result') {
    return (
      <ResultView
        run={view.run}
        pipeline={view.pipeline}
        agents={agents}
        onApprove={async () => {
          await api.approveRun(view.run.id);
          setView({ mode: 'list' });
          refresh();
        }}
        onDiscard={async () => {
          await api.discardRun(view.run.id);
          setView({ mode: 'list' });
          refresh();
        }}
        onRunAgain={() => {
          setView({ mode: 'launching', pipeline: view.pipeline });
        }}
      />
    );
  }

  // ── List view ───────────────────────────────────────────────────────────────
  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-white flex items-center gap-3">
            <GitFork className="text-primary w-7 h-7 sm:w-8 sm:h-8" />
            Pipelines
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Chain multiple AI agents in sequence — each one builds on the last.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="shrink-0" size="sm">
          <Plus className="w-4 h-4 mr-1.5" /> New Pipeline
        </Button>
      </div>

      {/* Pending Approvals */}
      <AnimatePresence>
        {pendingRuns.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-8">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4 text-amber-400 font-semibold">
                <ShieldAlert className="w-5 h-5" />
                <h3>Action Required: Pending Outputs ({pendingRuns.length})</h3>
              </div>
              <div className="space-y-3">
                {pendingRuns.map(run => {
                  const pipeline = pipelines.find(p => p.id === run.pipelineId);
                  return (
                    <Card key={run.id} className="p-3 sm:p-4 bg-[#1a1512] border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex -space-x-1.5">
                          {(run.stepsOutput || []).slice(0, 4).map((s, i) => (
                            <div key={i} className="w-7 h-7 rounded-full flex items-center justify-center text-sm border-2 border-[#1a1512]" style={{ backgroundColor: `${s.agentColor}20` }}>
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
                        <Button variant="outline" size="sm" onClick={() => setReviewRun(run)}>Review</Button>
                        <Button variant="primary" size="sm" onClick={() => handleApproveRun(run.id)} className="bg-emerald-600 hover:bg-emerald-500 border-emerald-500">
                          <Check className="w-4 h-4 mr-1" /> Approve
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDiscardRun(run.id)}>
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => <div key={i} className="h-56 bg-card/20 rounded-2xl animate-pulse" />)}
        </div>
      ) : pipelines.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border-2 border-dashed border-border rounded-2xl bg-card/10">
          <GitFork className="w-12 h-12 mb-4 opacity-40" />
          <p className="text-lg font-medium text-white/60">No pipelines yet</p>
          <p className="text-sm mt-1 mb-6">Templates are added automatically on server restart</p>
          <Button onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4 mr-2" /> Create Pipeline</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {pipelines.map(pipeline => {
            const isRunning = pipeline.status === 'running';
            return (
              <motion.div
                key={pipeline.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className={cn(
                  "p-5 flex flex-col h-full transition-all duration-300 group cursor-default",
                  !pipeline.isActive && "opacity-50 grayscale-[0.3]"
                )}>
                  {/* Top row: flow + toggle */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <AgentFlow steps={pipeline.steps} agents={agents} compact />
                    <Switch checked={pipeline.isActive} onChange={() => handleToggle(pipeline)} />
                  </div>

                  {/* Name + description */}
                  <h4 className="text-base font-bold text-white mb-1 leading-snug">{pipeline.name}</h4>
                  {pipeline.description && (
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed">{pipeline.description}</p>
                  )}

                  {/* Step count + status */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs text-white/40 bg-white/5 border border-border/30 px-2 py-0.5 rounded-full">
                      {pipeline.steps.length} steps
                    </span>
                    {pipeline.lastRanAt && (
                      <span className="text-xs text-muted-foreground">
                        Last ran {format(new Date(pipeline.lastRanAt), 'MMM d')}
                      </span>
                    )}
                    {pipeline.status === 'pending_approval' && (
                      <Badge variant="warning" className="text-xs">Awaiting review</Badge>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-auto pt-3 border-t border-border/40 flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditPipeline(pipeline); }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
                      title="Edit pipeline"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(pipeline.id, e)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Delete pipeline"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <Button
                      className="ml-auto"
                      size="sm"
                      disabled={isRunning || !pipeline.isActive}
                      onClick={() => setView({ mode: 'launching', pipeline })}
                    >
                      {isRunning
                        ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Running…</>
                        : <><Zap className="w-3.5 h-3.5 mr-1.5" /> Launch</>
                      }
                    </Button>
                  </div>
                </Card>
              </motion.div>
            );
          })}

          {/* Add card */}
          <button
            onClick={() => setCreateOpen(true)}
            className="rounded-2xl border-2 border-dashed border-border hover:border-primary/40 bg-transparent hover:bg-primary/5 transition-all p-5 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-white group min-h-[200px]"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
              <Plus className="w-6 h-6 text-primary" />
            </div>
            <span className="text-sm font-medium">New Pipeline</span>
          </button>
        </div>
      )}

      {/* Launch Modal */}
      {view.mode === 'launching' && (
        <LaunchModal
          pipeline={view.pipeline}
          workspaces={workspaces}
          agents={agents}
          onLaunch={(topic, businessTag) => {
            setView({ mode: 'running', pipeline: view.pipeline, topic, businessTag });
          }}
          onClose={() => setView({ mode: 'list' })}
        />
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

      {/* Review Pending Run Modal */}
      <Modal isOpen={!!reviewRun} onClose={() => setReviewRun(null)} title="Review Pipeline Output">
        {reviewRun && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {(reviewRun.stepsOutput || []).length} agents completed · {format(new Date(reviewRun.ranAt), 'MMM d, h:mm a')}
            </p>
            <div className="max-h-[50vh] overflow-y-auto pr-1 space-y-3">
              {(reviewRun.stepsOutput || []).map((step, i) => (
                <StepOutputCard key={i} step={step} defaultOpen={false} />
              ))}
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-border/50">
              <Button variant="destructive" onClick={() => handleDiscardRun(reviewRun.id)}>
                <X className="w-4 h-4 mr-2" /> Discard
              </Button>
              <Button className="bg-emerald-600 hover:bg-emerald-500 border-emerald-500" onClick={() => handleApproveRun(reviewRun.id)}>
                <Check className="w-4 h-4 mr-2" /> Approve
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
