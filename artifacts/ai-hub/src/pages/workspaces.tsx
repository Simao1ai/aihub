import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, Power, PowerOff, Check, X, RefreshCw, Lock, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { useAppStore } from '@/store';
import { cn } from '@/components/ui-elements';

interface WorkspaceRow {
  id: number;
  slug: string;
  name: string;
  description: string;
  emoji: string;
  color: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

const COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6',
  '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#84cc16',
  '#06b6d4', '#16a34a', '#dc2626', '#0891b2', '#7c3aed',
];

const EMOJIS = ['⚡', '💼', '🏠', '🚀', '🌟', '💡', '🎯', '🔑', '🏗️', '📊', '🛠️', '🌐', '💎', '🦁', '🔥', '🧹', '🚛', '💇', '🏢', '🎨'];

const INDUSTRIES = [
  { value: 'home_inspection', label: '🏠 Home Inspection', context: 'This is a home inspection business that operates B2B with real estate agents and realtors. Key goals: grow the realtor referral network, increase inspection volume, build a strong local reputation. Revenue model: per-inspection fees from home buyers referred by realtor partners.' },
  { value: 'trucking', label: '🚛 Trucking / Freight', context: 'This is a trucking and freight business. Key goals: acquire owner-operators and carrier clients, manage dispatch operations, ensure DOT compliance, and grow load volume. Revenue model may include dispatch fees, consulting, or SaaS subscriptions.' },
  { value: 'cleaning', label: '🧹 Cleaning Services', context: 'This is a cleaning services business (residential or commercial). Key goals: grow the client base, hire and manage cleaning staff or contractors, ensure quality control, and build a strong local reputation through reviews. Revenue model: recurring cleaning service fees.' },
  { value: 'salon', label: '💇 Salon / Beauty', context: 'This is a salon or beauty services business. Key goals: maximize chair utilization, reduce no-shows, grow recurring client relationships, and upsell services. Revenue model: service fees from haircuts, color, treatments, and beauty services.' },
  { value: 'real_estate', label: '🏢 Real Estate', context: 'This is a real estate investment and/or brokerage business. Key goals: identify and acquire undervalued properties, analyze deals, manage portfolio performance, and track equity and ROI. May include tax deed auctions, MLS deals, and off-market acquisitions.' },
  { value: 'saas', label: '💻 SaaS / Software', context: 'This is a software-as-a-service (SaaS) business. Key goals: acquire and retain paying subscribers, reduce churn, build product features that solve customer pain points, and scale efficiently. Revenue model: monthly or annual subscriptions.' },
  { value: 'consulting', label: '💼 Consulting / Coaching', context: 'This is a consulting or coaching business. Key goals: acquire ideal clients, deliver high-value results, build case studies and referrals, and scale through productized services or group programs. Revenue model: project fees, retainers, or program enrollments.' },
  { value: 'ecommerce', label: '🛍️ E-Commerce', context: 'This is an e-commerce business selling products online. Key goals: acquire customers profitably, maximize average order value, build repeat purchase rates, and optimize product listings. Revenue model: product sales margins.' },
  { value: 'restaurant', label: '🍽️ Restaurant / Food', context: 'This is a restaurant or food service business. Key goals: maximize table turns and order volume, build loyal regulars, manage food costs, and grow catering or delivery revenue. Revenue model: food and beverage sales.' },
  { value: 'marketing_agency', label: '📢 Marketing Agency', context: 'This is a marketing agency. Key goals: acquire and retain retainer clients, deliver measurable ROI, build a strong portfolio of case studies, and scale service delivery efficiently. Revenue model: monthly retainers and project fees.' },
  { value: 'other', label: '🌐 Other / Custom', context: '' },
];

// ─── Simple Edit Modal ─────────────────────────────────────────────────────

function WorkspaceEditModal({ initial, onSave, onClose }: {
  initial: WorkspaceRow;
  onSave: (data: any) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: initial.name,
    description: initial.description,
    emoji: initial.emoji,
    color: initial.color,
    password: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Name is required');
    setError('');
    const data: any = { name: form.name, description: form.description, emoji: form.emoji, color: form.color };
    if (form.password) data.password = form.password;
    onSave(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-[#131622] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="h-20 flex items-center justify-center" style={{ background: `${form.color}18` }}>
          <span className="text-4xl">{form.emoji}</span>
        </div>
        <div className="p-6">
          <h2 className="text-base font-display font-bold text-white mb-5">Edit workspace</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-white/40 mb-2 block">Icon</label>
              <div className="flex flex-wrap gap-1.5">
                {EMOJIS.map(e => (
                  <button key={e} type="button" onClick={() => setForm(f => ({ ...f, emoji: e }))}
                    className={cn("w-9 h-9 rounded-xl text-xl flex items-center justify-center transition-all", form.emoji === e ? 'bg-white/15 ring-2 ring-white/30' : 'bg-white/5 hover:bg-white/10')}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-white/40 mb-2 block">Color</label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                    className="w-7 h-7 rounded-lg transition-all flex items-center justify-center"
                    style={{ backgroundColor: c, boxShadow: form.color === c ? '0 0 0 2px white' : 'none' }}>
                    {form.color === c && <Check className="w-3 h-3 text-white" />}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1.5 block">Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/20" />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1.5 block">Description</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/20" />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1.5 block">New password (leave blank to keep current)</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
                <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Leave blank to keep current"
                  className="w-full bg-white/5 border border-white/8 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/20" />
              </div>
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/8 text-white/50 hover:text-white text-sm transition-all">Cancel</button>
              <button type="submit" className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold" style={{ background: form.color }}>Save changes</button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Onboarding Wizard ─────────────────────────────────────────────────────

function WorkspaceWizard({ onSave, onClose }: {
  onSave: (data: any) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    emoji: '⚡',
    color: '#6366f1',
    password: '',
    industry: '',
    description: '',
    businessContext: '',
  });
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError] = useState('');

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);

  const handleName = (v: string) => {
    setForm(f => ({ ...f, name: v, slug: slugEdited ? f.slug : autoSlug(v) }));
  };

  const handleIndustry = (value: string) => {
    const ind = INDUSTRIES.find(i => i.value === value);
    setForm(f => ({
      ...f,
      industry: value,
      businessContext: ind?.value !== 'other' ? ind?.context ?? '' : f.businessContext,
    }));
  };

  const validateStep1 = () => {
    if (!form.name.trim()) return 'Business name is required';
    if (!form.slug.trim()) return 'Slug is required';
    if (!/^[a-z0-9_]+$/.test(form.slug)) return 'Slug must be lowercase letters, numbers, underscores only';
    if (!form.password.trim() || form.password.length < 4) return 'Password must be at least 4 characters';
    return '';
  };

  const handleNext = () => {
    if (step === 1) {
      const err = validateStep1();
      if (err) { setError(err); return; }
    }
    setError('');
    setStep(s => s + 1);
  };

  const handleCreate = () => {
    const data: any = {
      name: form.name,
      slug: form.slug,
      description: form.description || `${form.name} workspace`,
      emoji: form.emoji,
      color: form.color,
      password: form.password,
    };
    if (form.businessContext) data.businessContext = form.businessContext;
    onSave(data);
  };

  const stepLabel = ['Basics', 'Business Profile', 'Create'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-[#131622] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Banner */}
        <div className="h-20 flex items-center justify-between px-6 relative overflow-hidden" style={{ background: `${form.color}18` }}>
          <div className="flex items-center gap-3">
            <span className="text-4xl">{form.emoji}</span>
            <div>
              <p className="text-sm font-bold text-white">{form.name || 'New Workspace'}</p>
              <p className="text-xs text-white/35">{step === 1 ? 'Set up basics' : step === 2 ? 'Business context' : 'Ready to create'}</p>
            </div>
          </div>
          {/* Steps */}
          <div className="flex gap-1.5">
            {[1, 2, 3].map(s => (
              <div key={s} className={cn("w-6 h-1.5 rounded-full transition-all", s <= step ? 'opacity-100' : 'opacity-25')}
                style={{ background: s <= step ? form.color : 'white' }} />
            ))}
          </div>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* Step 1: Basics */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div>
                  <label className="text-xs text-white/40 mb-2 block">Pick an icon</label>
                  <div className="flex flex-wrap gap-1.5">
                    {EMOJIS.map(e => (
                      <button key={e} type="button" onClick={() => setForm(f => ({ ...f, emoji: e }))}
                        className={cn("w-9 h-9 rounded-xl text-xl flex items-center justify-center transition-all", form.emoji === e ? 'bg-white/15 ring-2 ring-white/30' : 'bg-white/5 hover:bg-white/10')}>
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-2 block">Brand color</label>
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map(c => (
                      <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: c, boxShadow: form.color === c ? '0 0 0 2px white' : 'none' }}>
                        {form.color === c && <Check className="w-3 h-3 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1.5 block">Business name *</label>
                  <input autoFocus value={form.name} onChange={e => handleName(e.target.value)}
                    placeholder="e.g. Sweepello" className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20" />
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1.5 block">Workspace ID <span className="text-white/20">(auto-generated, cannot be changed later)</span></label>
                  <input value={form.slug} onChange={e => { setSlugEdited(true); setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })); }}
                    placeholder="e.g. sweepello" className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 font-mono" />
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1.5 block">
                    <Lock className="w-3 h-3 inline mr-1" />Workspace password *
                  </label>
                  <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Min 4 characters" className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20" />
                </div>
              </motion.div>
            )}

            {/* Step 2: Business Profile */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div>
                  <label className="text-xs text-white/40 mb-1.5 block">Industry</label>
                  <select
                    value={form.industry}
                    onChange={e => handleIndustry(e.target.value)}
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/20"
                  >
                    <option value="">Select an industry...</option>
                    {INDUSTRIES.map(ind => (
                      <option key={ind.value} value={ind.value}>{ind.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1.5 block">Short description</label>
                  <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder={`What ${form.name || 'this business'} does in one line`}
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20" />
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1.5 block flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> AI Business Context <span className="text-white/20 font-normal ml-1">(auto-filled from industry, edit as needed)</span>
                  </label>
                  <textarea
                    value={form.businessContext}
                    onChange={e => setForm(f => ({ ...f, businessContext: e.target.value }))}
                    placeholder="Describe what this business does, who the customers are, key goals, and revenue model. This gets injected into every AI conversation in this workspace."
                    rows={5}
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 resize-none leading-relaxed"
                  />
                  <p className="text-[10px] text-white/25 mt-1">This context is automatically injected into every AI agent conversation in this workspace.</p>
                </div>
              </motion.div>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="space-y-3">
                  {[
                    { label: 'Workspace', value: `${form.emoji} ${form.name}` },
                    { label: 'ID', value: form.slug },
                    { label: 'Industry', value: INDUSTRIES.find(i => i.value === form.industry)?.label ?? 'Not set' },
                    { label: 'Description', value: form.description || 'None' },
                    { label: 'AI Context', value: form.businessContext ? `${form.businessContext.slice(0, 80)}...` : 'Not set' },
                  ].map(item => (
                    <div key={item.label} className="flex gap-3 text-sm">
                      <span className="text-white/35 w-24 shrink-0">{item.label}</span>
                      <span className="text-white font-medium leading-relaxed">{item.value}</span>
                    </div>
                  ))}
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20 text-xs text-emerald-400 flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  All 16 AI agents will be available. Your AI context will power every conversation in this workspace.
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && <p className="text-red-400 text-xs mt-3">{error}</p>}

          <div className="flex gap-2 mt-6">
            <button
              onClick={step === 1 ? onClose : () => { setStep(s => s - 1); setError(''); }}
              className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-white/8 text-white/50 hover:text-white text-sm transition-all"
            >
              {step === 1 ? 'Cancel' : <><ChevronLeft className="w-4 h-4" /> Back</>}
            </button>
            <button
              onClick={step < 3 ? handleNext : handleCreate}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all"
              style={{ background: form.color }}
            >
              {step < 3 ? (<>Next <ChevronRight className="w-4 h-4" /></>) : (<><Check className="w-4 h-4" /> Create workspace</>)}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function Workspaces() {
  const { account } = useAppStore();
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; ws?: WorkspaceRow } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const authHeader = { Authorization: `Bearer ${account?.password ?? ''}` };

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/workspaces/all', { headers: authHeader });
      if (!res.ok) throw new Error(await res.text());
      setWorkspaces(await res.json());
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (data: any) => {
    setSaving(true);
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create');
      }
      setModal(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: number, data: any) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/workspaces/${id}`, {
        method: 'PUT',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update');
      setModal(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (ws: WorkspaceRow) => {
    await fetch(`/api/workspaces/${ws.id}`, {
      method: 'PUT',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !ws.isActive }),
    });
    await load();
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/workspaces/${id}`, { method: 'DELETE', headers: authHeader });
    setDeleteConfirm(null);
    await load();
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 px-8 pt-8 pb-5 bg-[#0c0e16]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Workspaces</h1>
            <p className="text-sm text-white/35 mt-0.5">Manage your business workspaces and login access</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/8 border border-white/8 flex items-center justify-center text-white/40 hover:text-white transition-all"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setModal({ mode: 'create' })}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all"
            >
              <Plus className="w-4 h-4" /> Add workspace
            </button>
          </div>
        </div>
      </div>

      <div className="px-8 py-8 max-w-3xl mx-auto">
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-white/25">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {workspaces.map((ws) => (
              <motion.div
                key={ws.id}
                layout
                className={cn(
                  "flex items-center gap-4 p-4 rounded-2xl border transition-all",
                  ws.isActive ? 'bg-[#111520] border-white/5 hover:border-white/10' : 'bg-[#0e1018] border-white/3 opacity-50'
                )}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ background: `${ws.color}18` }}>
                  {ws.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white">{ws.name}</p>
                    <span className="text-[10px] font-mono text-white/25 bg-white/5 px-1.5 py-0.5 rounded">{ws.slug}</span>
                    {!ws.isActive && <span className="text-[10px] text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">inactive</span>}
                  </div>
                  <p className="text-xs text-white/35 mt-0.5 truncate">{ws.description || 'No description'}</p>
                </div>
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: ws.color, boxShadow: `0 0 8px ${ws.color}60` }} />
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => setModal({ mode: 'edit', ws })} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all" title="Edit">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleToggle(ws)} className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-all", ws.isActive ? 'bg-white/5 hover:bg-amber-500/10 text-white/40 hover:text-amber-400' : 'bg-white/5 hover:bg-emerald-500/10 text-white/40 hover:text-emerald-400')} title={ws.isActive ? 'Deactivate' : 'Activate'}>
                    {ws.isActive ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                  </button>
                  {deleteConfirm === ws.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleDelete(ws.id)} className="w-8 h-8 rounded-lg bg-red-500/15 text-red-400 flex items-center justify-center hover:bg-red-500/25 transition-all"><Check className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteConfirm(null)} className="w-8 h-8 rounded-lg bg-white/5 text-white/40 flex items-center justify-center hover:bg-white/10 transition-all"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(ws.id)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-red-500/10 flex items-center justify-center text-white/25 hover:text-red-400 transition-all" title="Remove">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}

            {workspaces.length === 0 && (
              <div className="text-center py-16 text-white/20">
                <p className="text-sm">No workspaces yet</p>
                <button onClick={() => setModal({ mode: 'create' })} className="mt-3 text-primary text-sm hover:underline">
                  Create your first workspace
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 p-4 rounded-2xl bg-white/3 border border-white/5 text-xs text-white/30 leading-relaxed">
          <p className="font-semibold text-white/50 mb-1">Tip: Override passwords via environment secrets</p>
          Set GENERAL_PASSWORD, LES_A_PASSWORD, CARRIERDESKH_PASSWORD, SALONSYNC_PASSWORD, SWEEPELLO_PASSWORD, or REAL_ESTATE_PASSWORD as secrets to override workspace passwords at startup.
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {modal?.mode === 'create' && (
          <WorkspaceWizard onSave={handleCreate} onClose={() => setModal(null)} />
        )}
        {modal?.mode === 'edit' && modal.ws && (
          <WorkspaceEditModal initial={modal.ws} onSave={data => handleUpdate(modal.ws!.id, data)} onClose={() => setModal(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
