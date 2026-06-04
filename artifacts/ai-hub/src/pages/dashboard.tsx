import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { format } from 'date-fns';
import {
  Bot, Brain, Zap, Link2, ShieldAlert, CheckSquare, Users,
  ArrowRight, Clock, Sparkles, GitFork, TrendingUp,
  Plus, Pencil, Trash2, Check, X, Share2, Calendar, Send, AlertTriangle, ExternalLink, Settings2, RefreshCw
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

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

// ─── KPI Card ──────────────────────────────────────────────────────────────

interface Kpi { id: number; name: string; value: number; unit: string; period: string; businessTag: string; }

const KPI_TEMPLATES: Record<string, Array<{ name: string; unit: string }>> = {
  les_a_inspections: [
    { name: 'Monthly Revenue', unit: '$' }, { name: 'Inspections Completed', unit: '#' },
    { name: 'Realtor Referrals', unit: '#' }, { name: 'Avg. Job Value', unit: '$' },
    { name: 'Review Rating', unit: '#' }, { name: 'Repeat Clients', unit: '%' },
  ],
  home_inspection: [
    { name: 'Monthly Revenue', unit: '$' }, { name: 'Inspections Completed', unit: '#' },
    { name: 'Realtor Referrals', unit: '#' }, { name: 'Avg. Job Value', unit: '$' },
  ],
  carrierdeskh_q: [
    { name: 'MRR', unit: '$' }, { name: 'Active Clients', unit: '#' },
    { name: 'Loads Dispatched', unit: '#' }, { name: 'Churn Rate', unit: '%' },
    { name: 'Revenue per Load', unit: '$' }, { name: 'New Sign-ups', unit: '#' },
  ],
  equifind: [
    { name: 'Claims Filed', unit: '#' }, { name: 'Funds Recovered', unit: '$' },
    { name: 'Active Cases', unit: '#' }, { name: 'Avg. Recovery', unit: '$' },
    { name: 'Win Rate', unit: '%' }, { name: 'Leads Pipeline', unit: '#' },
  ],
  salonsync_hub: [
    { name: 'MRR', unit: '$' }, { name: 'Active Salons', unit: '#' },
    { name: 'Bookings Processed', unit: '#' }, { name: 'Churn Rate', unit: '%' },
    { name: 'Avg. Revenue/Salon', unit: '$' }, { name: 'Support Tickets', unit: '#' },
  ],
  sweepello: [
    { name: 'MRR', unit: '$' }, { name: 'Active Cleaners', unit: '#' },
    { name: 'Jobs Completed', unit: '#' }, { name: 'Customer Rating', unit: '#' },
    { name: 'New Clients', unit: '#' }, { name: 'Repeat Rate', unit: '%' },
  ],
  real_estate: [
    { name: 'Portfolio Value', unit: '$' }, { name: 'Properties', unit: '#' },
    { name: 'Monthly Rent', unit: '$' }, { name: 'Occupancy Rate', unit: '%' },
    { name: 'Net Cash Flow', unit: '$' }, { name: 'Deals in Pipeline', unit: '#' },
  ],
  general: [
    { name: 'Total Revenue', unit: '$' }, { name: 'Active Projects', unit: '#' },
    { name: 'Team Size', unit: '#' }, { name: 'Growth Rate', unit: '%' },
  ],
};

function KpiSection({ businessTag, workspaceId, initialKpiUrl, token }: {
  businessTag: string;
  workspaceId?: number;
  initialKpiUrl?: string | null;
  token?: string;
}) {
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; kpi?: Kpi } | null>(null);
  const [form, setForm] = useState({ name: '', value: '', unit: '', period: '' });
  const [saving, setSaving] = useState(false);
  const templates = KPI_TEMPLATES[businessTag] ?? KPI_TEMPLATES.general;

  // KPI feed URL settings
  const [showUrlPanel, setShowUrlPanel] = useState(false);
  const [urlDraft, setUrlDraft] = useState(initialKpiUrl ?? '');
  const [savingUrl, setSavingUrl] = useState(false);
  const [kpiUrl, setKpiUrl] = useState(initialKpiUrl ?? '');

  const saveKpiUrl = async () => {
    if (!workspaceId || !token) return;
    setSavingUrl(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ externalKpiUrl: urlDraft.trim() || null }),
      });
      if (res.ok) {
        setKpiUrl(urlDraft.trim());
        setShowUrlPanel(false);
      }
    } finally { setSavingUrl(false); }
  };

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/kpis?businessTag=${businessTag}`);
      if (!res.ok) { setKpis([]); return; }
      const data = await res.json();
      setKpis(Array.isArray(data) ? data : []);
    } catch { setKpis([]); }
  }, [businessTag]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm({ name: '', value: '', unit: '$', period: format(new Date(), 'MMM yyyy') });
    setModal({ mode: 'create' });
  };
  const openEdit = (kpi: Kpi) => {
    setForm({ name: kpi.name, value: String(kpi.value), unit: kpi.unit, period: kpi.period });
    setModal({ mode: 'edit', kpi });
  };

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      const body = { name: form.name, value: parseFloat(form.value) || 0, unit: form.unit, period: form.period, businessTag };
      if (modal?.mode === 'create') {
        await fetch('/api/kpis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      } else if (modal?.kpi) {
        await fetch(`/api/kpis/${modal.kpi.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      }
      setModal(null);
      load();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/kpis/${id}`, { method: 'DELETE' });
    load();
  };

  const formatVal = (kpi: Kpi) => {
    const n = kpi.value;
    const formatted = n >= 1000000
      ? `${(n / 1000000).toFixed(1)}M`
      : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n % 1 === 0 ? n : n.toFixed(1));
    if (kpi.unit === '$') return `$${formatted}`;
    if (kpi.unit === '%') return `${formatted}%`;
    return `${formatted}${kpi.unit ? ' ' + kpi.unit : ''}`;
  };

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold text-white flex items-center gap-2 text-sm">
          <TrendingUp className="w-4 h-4 text-primary" /> KPIs
          {kpis[0]?.period && <span className="text-xs text-white/25 font-normal">· {kpis[0].period}</span>}
          {kpiUrl && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 font-normal">auto-synced</span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {workspaceId && (
            <button
              onClick={() => setShowUrlPanel(v => !v)}
              className={`text-xs flex items-center gap-1 transition-colors ${showUrlPanel ? 'text-primary' : 'text-white/20 hover:text-white/50'}`}
              title="Configure KPI feed URL"
            >
              <Settings2 className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={openCreate}
            className="text-xs text-white/30 hover:text-primary flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
      </div>

      {/* KPI Feed URL panel */}
      <AnimatePresence>
        {showUrlPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 overflow-hidden"
          >
            <div className="p-3 rounded-xl border border-white/8 bg-white/3 space-y-2">
              <p className="text-[11px] text-white/40">
                Point to a JSON endpoint that returns KPI data — it'll be polled every hour.
                Format: <code className="text-white/60 bg-white/5 px-1 rounded">{'{"kpis":[{"name":"Revenue","value":5000,"unit":"$"}]}'}</code>
              </p>
              <div className="flex gap-2">
                <input
                  value={urlDraft}
                  onChange={e => setUrlDraft(e.target.value)}
                  placeholder="https://your-app.com/api/kpis"
                  className="flex-1 bg-white/4 border border-white/8 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40 transition-all"
                />
                <button
                  onClick={saveKpiUrl}
                  disabled={savingUrl}
                  className="px-3 py-2 rounded-lg bg-primary/90 hover:bg-primary text-white text-xs font-semibold disabled:opacity-50 flex items-center gap-1 transition-all"
                >
                  {savingUrl ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  Save
                </button>
                {kpiUrl && (
                  <button
                    onClick={() => { setUrlDraft(''); saveKpiUrl(); }}
                    className="px-3 py-2 rounded-lg bg-white/5 hover:bg-red-500/10 text-white/40 hover:text-red-400 text-xs transition-all"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {kpis.length === 0 ? (
        <button
          onClick={openCreate}
          className="w-full py-6 rounded-xl border border-dashed border-white/8 text-white/20 hover:text-white/40 hover:border-white/15 text-xs transition-all flex flex-col items-center gap-2"
        >
          <TrendingUp className="w-5 h-5 opacity-40" />
          Add your first KPI metric
        </button>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {kpis.map(kpi => (
            <div key={kpi.id} className="group relative p-4 rounded-xl bg-white/3 border border-white/5 hover:border-white/10 transition-all">
              <p className="text-[11px] text-white/35 mb-1 truncate">{kpi.name}</p>
              <p className="text-xl font-display font-bold text-white">{formatVal(kpi)}</p>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button onClick={() => openEdit(kpi)} className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10">
                  <Pencil className="w-3 h-3" />
                </button>
                <button onClick={() => handleDelete(kpi.id)} className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/10">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={openCreate}
            className="p-4 rounded-xl border border-dashed border-white/8 text-white/20 hover:text-white/40 hover:border-white/15 transition-all flex items-center justify-center"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Modal */}
      <AnimatePresence>
        {modal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-[#131622] border border-white/10 rounded-2xl shadow-2xl p-6"
            >
              <h2 className="text-sm font-display font-bold text-white mb-4">
                {modal.mode === 'create' ? 'Add KPI' : 'Edit KPI'}
              </h2>
              <div className="space-y-3">
                {modal.mode === 'create' && templates.length > 0 && (
                  <div>
                    <label className="text-xs text-white/40 mb-2 block">Quick-fill</label>
                    <div className="flex flex-wrap gap-1.5">
                      {templates.map(t => (
                        <button
                          key={t.name}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, name: t.name, unit: t.unit }))}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                            form.name === t.name
                              ? 'bg-primary/20 border-primary/40 text-primary'
                              : 'bg-white/4 border-white/8 text-white/45 hover:text-white/80 hover:border-white/20'
                          }`}
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-xs text-white/40 mb-1.5 block">Metric name *</label>
                  <input
                    autoFocus
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Monthly Revenue"
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/40 mb-1.5 block">Value</label>
                    <input
                      type="number"
                      value={form.value}
                      onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                      placeholder="0"
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 mb-1.5 block">Unit</label>
                    <select
                      value={form.unit}
                      onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/20"
                    >
                      {['$', '%', '#', 'hrs', 'leads', 'clients', 'jobs', 'deals'].map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1.5 block">Period</label>
                  <input
                    value={form.period}
                    onChange={e => setForm(f => ({ ...f, period: e.target.value }))}
                    placeholder="e.g. Apr 2026"
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl border border-white/8 text-white/50 hover:text-white text-sm transition-all">
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || !form.name}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all"
                  >
                    {saving ? 'Saving…' : modal.mode === 'create' ? 'Add KPI' : 'Save'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Active Pipeline Runs Widget ─────────────────────────────────────────

function ActivePipelinesWidget({ onNavigate }: { onNavigate: () => void }) {
  const [runs, setRuns] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/pipelines/runs/list?status=pending_approval')
      .then(r => r.json())
      .then(d => setRuns(Array.isArray(d) ? d.slice(0, 4) : []))
      .catch(() => {});
  }, []);

  if (runs.length === 0) return null;

  return (
    <motion.div variants={item} className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-white text-sm flex items-center gap-2">
          <GitFork className="w-4 h-4 text-indigo-400" />
          {runs.length} Pipeline run{runs.length > 1 ? 's' : ''} awaiting review
        </h3>
        <button onClick={onNavigate} className="text-xs text-indigo-400/60 hover:text-indigo-400 flex items-center gap-1 transition-colors">
          Review <ArrowRight className="w-3 h-3" />
        </button>
      </div>
      <div className="space-y-2">
        {runs.map((run: any) => (
          <div key={run.id} className="flex items-center gap-3 bg-black/20 rounded-xl px-4 py-2.5 border border-white/5">
            <GitFork className="w-4 h-4 text-indigo-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{run.pipelineName ?? `Pipeline Run #${run.id}`}</p>
              <p className="text-[10px] text-white/30">{run.ranAt ? format(new Date(run.ranAt), 'MMM d, h:mm a') : ''}</p>
            </div>
            <button
              onClick={onNavigate}
              className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
            >
              Review <ExternalLink className="w-2.5 h-2.5" />
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Cross-Business Overview (General workspace only) ────────────────────

function CrossBusinessOverview() {
  const [, setLocation] = useLocation();
  const [allWorkspaces, setAllWorkspaces] = useState<any[]>([]);
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});
  const [overdueCounts, setOverdueCounts] = useState<Record<string, number>>({});
  const [contactCounts, setContactCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch('/api/auth/workspaces').then(r => r.json()).then(ws => {
      const active = ws.filter((w: any) => w.slug !== 'general');
      setAllWorkspaces(active);
      const today = new Date().toISOString().split('T')[0];
      active.forEach(async (w: any) => {
        try {
          const [tasks, contacts] = await Promise.all([
            fetch(`/api/tasks?businessTag=${w.slug}`).then(r => r.json()),
            fetch(`/api/contacts?businessTag=${w.slug}`).then(r => r.json()),
          ]);
          const activeTasks = Array.isArray(tasks) ? tasks.filter((t: any) => t.status !== 'done') : [];
          const overdue = activeTasks.filter((t: any) => t.dueDate && t.dueDate < today).length;
          setTaskCounts(prev => ({ ...prev, [w.slug]: activeTasks.length }));
          setOverdueCounts(prev => ({ ...prev, [w.slug]: overdue }));
          setContactCounts(prev => ({ ...prev, [w.slug]: Array.isArray(contacts) ? contacts.length : 0 }));
        } catch {}
      });
    }).catch(() => {});
  }, []);

  if (allWorkspaces.length === 0) return null;

  return (
    <motion.div variants={item} className="rounded-2xl border border-white/5 bg-[#111520] p-6">
      <h3 className="font-display font-semibold text-white text-sm mb-4 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" /> All Businesses
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {allWorkspaces.map((ws: any) => {
          const overdue = overdueCounts[ws.slug] ?? 0;
          return (
            <div
              key={ws.slug}
              className="p-3 rounded-xl bg-white/3 border border-white/5 hover:border-white/10 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-base"
                  style={{ background: `${ws.color}20` }}
                >
                  {ws.emoji}
                </div>
                <p className="text-xs font-semibold text-white/80 truncate">{ws.name}</p>
              </div>
              <div className="flex gap-3 text-[11px] text-white/30">
                <span>{taskCounts[ws.slug] ?? 0} tasks</span>
                {overdue > 0 && (
                  <span className="text-red-400 flex items-center gap-0.5">
                    <AlertTriangle className="w-2.5 h-2.5" />{overdue} overdue
                  </span>
                )}
                <span>{contactCounts[ws.slug] ?? 0} contacts</span>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Social Stats Widget ──────────────────────────────────────────────────

function SocialStatsWidget({ businessTag, onNavigate }: { businessTag: string; onNavigate: () => void }) {
  const [stats, setStats] = useState<{ queued: number; scheduled: number; postedToday: number; totalPosted: number } | null>(null);

  useEffect(() => {
    fetch(`/api/social-posts/stats?businessTag=${businessTag}`)
      .then(r => r.json())
      .then(setStats)
      .catch(() => {});
  }, [businessTag]);

  if (!stats || (stats.queued === 0 && stats.scheduled === 0 && stats.totalPosted === 0)) return null;

  const items = [
    { label: 'Needs Review', value: stats.queued, icon: Share2, color: '#f59e0b', bg: '#f59e0b15' },
    { label: 'Scheduled', value: stats.scheduled, icon: Calendar, color: '#8b5cf6', bg: '#8b5cf615' },
    { label: 'Posted Today', value: stats.postedToday, icon: Send, color: '#10b981', bg: '#10b98115' },
    { label: 'Total Published', value: stats.totalPosted, icon: TrendingUp, color: '#3b82f6', bg: '#3b82f615' },
  ];

  return (
    <div className="rounded-2xl border border-white/5 bg-[#111520] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-white text-sm flex items-center gap-2">
          <Share2 className="w-4 h-4 text-violet-400" /> Social Media
        </h3>
        <button
          onClick={onNavigate}
          className="text-xs text-white/30 hover:text-white/60 flex items-center gap-1 transition-colors"
        >
          View all <ArrowRight className="w-3 h-3" />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {items.map(it => {
          const Icon = it.icon;
          return (
            <button
              key={it.label}
              onClick={onNavigate}
              className="text-left p-3 rounded-xl border border-white/5 hover:border-white/10 hover:bg-white/3 transition-all group"
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2" style={{ background: it.bg, color: it.color }}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <p className="text-lg font-display font-bold text-white">{it.value}</p>
              <p className="text-[10px] text-white/30 mt-0.5">{it.label}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────

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

  const [taskCount, setTaskCount] = useState(0);
  const [contactCount, setContactCount] = useState(0);
  const [wsId, setWsId] = useState<number | undefined>(undefined);
  const [wsKpiUrl, setWsKpiUrl] = useState<string | null>(null);

  const { account } = useAppStore();

  useEffect(() => {
    fetch(`/api/tasks?businessTag=${businessTag}`).then(r => r.json()).then(d => setTaskCount(Array.isArray(d) ? d.filter((t: any) => t.status !== 'done').length : 0)).catch(() => {});
    fetch(`/api/contacts?businessTag=${businessTag}`).then(r => r.json()).then(d => setContactCount(Array.isArray(d) ? d.length : 0)).catch(() => {});
    // Fetch workspace for KPI feed URL + ID
    fetch('/api/workspaces').then(r => r.json()).then((workspaces: any[]) => {
      const ws = workspaces.find((w: any) => w.slug === businessTag);
      if (ws) { setWsId(ws.id); setWsKpiUrl(ws.externalKpiUrl ?? null); }
    }).catch(() => {});
  }, [businessTag]);

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

  const hour = new Date().getHours();
  const timeGreet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const greeting = account?.displayName ? `${timeGreet}, ${account.displayName}` : timeGreet;
  const isGeneral = businessTag === 'general';

  const stats = [
    { label: 'AI Agents', value: agents.length, icon: Bot, color: '#6366f1', href: '/agents', bg: '#6366f115' },
    { label: 'Brain Docs', value: brainDocs.length, icon: Brain, color: '#8b5cf6', href: '/brain', bg: '#8b5cf615' },
    { label: 'Open Tasks', value: taskCount, icon: CheckSquare, color: '#10b981', href: '/tasks', bg: '#10b98115' },
    { label: 'Contacts', value: contactCount, icon: Users, color: '#3b82f6', href: '/contacts', bg: '#3b82f615' },
    { label: 'Connected', value: connections.length, icon: Link2, color: '#14b8a6', href: '/connections', bg: '#14b8a615' },
    { label: 'Pending Review', value: pendingRuns.length, icon: ShieldAlert, color: pendingRuns.length > 0 ? '#f59e0b' : '#6b7280', href: '/automations', bg: pendingRuns.length > 0 ? '#f59e0b15' : '#6b728015' },
  ];

  return (
    <div className="h-full overflow-y-auto">
      {/* Top header */}
      <div className="sticky top-0 z-10 px-4 sm:px-8 pt-4 sm:pt-8 pb-4 sm:pb-5 bg-[#0c0e16]/90 backdrop-blur-md border-b border-white/5">
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

      <div className="px-4 sm:px-8 py-5 sm:py-8 max-w-5xl mx-auto">
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

          {/* Stats row */}
          <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: stat.bg, color: stat.color }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <ArrowRight className="w-3 h-3 text-white/15 group-hover:text-white/40 transition-colors" />
                  </div>
                  <p className="text-xl font-display font-bold text-white">{stat.value}</p>
                  <p className="text-[11px] text-white/35 mt-0.5">{stat.label}</p>
                </button>
              );
            })}
          </motion.div>

          {/* KPI Section */}
          <motion.div variants={item} className="rounded-2xl border border-white/5 bg-[#111520] p-6">
            <KpiSection
              businessTag={businessTag}
              workspaceId={wsId}
              initialKpiUrl={wsKpiUrl}
              token={account?.token}
            />
          </motion.div>

          {/* Social Media Stats */}
          <motion.div variants={item}>
            <SocialStatsWidget businessTag={businessTag} onNavigate={() => setLocation('/social')} />
          </motion.div>

          {/* Active Pipeline Runs */}
          <ActivePipelinesWidget onNavigate={() => setLocation('/pipelines')} />

          {/* Cross-business overview (General only) */}
          {isGeneral && <CrossBusinessOverview />}

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
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0" style={{ background: `${run.agentColor}20` }}>
                        {run.agentIcon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{run.automationName}</p>
                        <p className="text-xs text-white/35">{run.agentName} · {format(new Date(run.ranAt), 'MMM d, h:mm a')}</p>
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => handleApprove(run.id)} className="w-8 h-8 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 flex items-center justify-center transition-all">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDiscard(run.id)} className="w-8 h-8 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 flex items-center justify-center transition-all">
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
                <button onClick={() => setLocation('/agents')} className="text-xs text-white/30 hover:text-primary flex items-center gap-1 transition-colors">
                  Open <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {agents.map(agent => (
                  <button
                    key={agent.id}
                    onClick={() => setLocation('/agents')}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/3 hover:bg-white/6 border border-white/5 hover:border-white/10 transition-all group"
                  >
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl" style={{ background: `${agent.color}18` }}>
                      {agent.icon}
                    </div>
                    <p className="text-xs font-semibold text-white/70 group-hover:text-white truncate w-full text-center">{agent.name}</p>
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
                <button onClick={() => setLocation('/agents')} className="text-xs text-white/30 hover:text-primary flex items-center gap-1 transition-colors">
                  All <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              {recentConvs.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-8 text-white/20">
                  <Sparkles className="w-8 h-8 mb-3 opacity-30" />
                  <p className="text-xs">No chats yet</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {recentConvs.map(conv => {
                    const agent = agents.find(a => a.id === conv.agentId);
                    return (
                      <button key={conv.id} onClick={() => setLocation('/agents')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-left group">
                        {agent && (
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0" style={{ background: `${agent.color}18` }}>
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
          <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'New Post', sub: 'Social media', icon: Share2, color: '#f59e0b', href: '/social' },
              { label: 'Run Pipeline', sub: 'Multi-step AI', icon: GitFork, color: '#6366f1', href: '/pipelines' },
              { label: 'Add Task', sub: 'Kanban board', icon: CheckSquare, color: '#10b981', href: '/tasks' },
              { label: 'Brain', sub: 'Knowledge base', icon: Brain, color: '#8b5cf6', href: '/brain' },
            ].map(q => {
              const Icon = q.icon;
              return (
                <button
                  key={q.href}
                  onClick={() => setLocation(q.href)}
                  className="flex items-center gap-3 p-4 rounded-2xl border border-white/5 bg-[#111520] hover:bg-[#141824] hover:border-white/10 transition-all group text-left"
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${q.color}18`, color: q.color }}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white/80 group-hover:text-white">{q.label}</p>
                    <p className="text-xs text-white/30 truncate">{q.sub}</p>
                  </div>
                </button>
              );
            })}
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}
