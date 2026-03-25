import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, Power, PowerOff, Check, X, RefreshCw, Lock } from 'lucide-react';
import { useAppStore } from '@/store';

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
];

const EMOJIS = ['⚡', '💼', '🏠', '🚀', '🌟', '💡', '🎯', '🔑', '🏗️', '📊', '🛠️', '🌐', '💎', '🦁', '🔥'];

function WorkspaceModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: Partial<WorkspaceRow>;
  onSave: (data: any) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    slug: initial?.slug ?? '',
    description: initial?.description ?? '',
    emoji: initial?.emoji ?? '⚡',
    color: initial?.color ?? '#6366f1',
    password: '',
  });
  const [slugEdited, setSlugEdited] = useState(!!initial?.slug);
  const [error, setError] = useState('');

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);

  const handleName = (v: string) => {
    setForm(f => ({
      ...f,
      name: v,
      slug: slugEdited ? f.slug : autoSlug(v),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Name is required');
    if (!form.slug.trim()) return setError('Slug is required');
    if (!/^[a-z0-9_]+$/.test(form.slug)) return setError('Slug must be lowercase letters, numbers, underscores only');
    if (!initial && !form.password.trim()) return setError('Password is required for new workspaces');
    setError('');
    const data: any = {
      name: form.name,
      description: form.description,
      emoji: form.emoji,
      color: form.color,
    };
    if (!initial) data.slug = form.slug;
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
        {/* Header preview */}
        <div className="h-20 flex items-center justify-center" style={{ background: `${form.color}18` }}>
          <span className="text-4xl">{form.emoji}</span>
        </div>

        <div className="p-6">
          <h2 className="text-base font-display font-bold text-white mb-5">
            {initial ? 'Edit workspace' : 'Add workspace'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Emoji picker */}
            <div>
              <label className="text-xs text-white/40 font-medium mb-2 block">Icon</label>
              <div className="flex flex-wrap gap-2">
                {EMOJIS.map(e => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, emoji: e }))}
                    className={`w-9 h-9 rounded-xl text-xl flex items-center justify-center transition-all ${
                      form.emoji === e ? 'bg-white/15 ring-2 ring-white/30' : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Color picker */}
            <div>
              <label className="text-xs text-white/40 font-medium mb-2 block">Color</label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, color: c }))}
                    className="w-7 h-7 rounded-lg transition-all flex items-center justify-center"
                    style={{ backgroundColor: c, boxShadow: form.color === c ? `0 0 0 2px white` : 'none' }}
                  >
                    {form.color === c && <Check className="w-3 h-3 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="text-xs text-white/40 font-medium mb-1.5 block">Workspace name *</label>
              <input
                value={form.name}
                onChange={e => handleName(e.target.value)}
                placeholder="e.g. Equifind Recovery"
                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20"
              />
            </div>

            {/* Slug (create only) */}
            {!initial && (
              <div>
                <label className="text-xs text-white/40 font-medium mb-1.5 block">
                  Slug <span className="text-white/20">(unique ID, cannot be changed)</span>
                </label>
                <input
                  value={form.slug}
                  onChange={e => { setSlugEdited(true); setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })); }}
                  placeholder="e.g. equifind"
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 font-mono"
                />
              </div>
            )}

            {/* Description */}
            <div>
              <label className="text-xs text-white/40 font-medium mb-1.5 block">Description</label>
              <input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Short description of this workspace"
                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20"
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-xs text-white/40 font-medium mb-1.5 block">
                {initial ? 'New password (leave blank to keep current)' : 'Password *'}
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder={initial ? 'Leave blank to keep current' : 'Min 4 characters'}
                  className="w-full bg-white/5 border border-white/8 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20"
                />
              </div>
            </div>

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-white/8 text-white/50 hover:text-white text-sm font-medium transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-all"
                style={{ background: form.color }}
              >
                {initial ? 'Save changes' : 'Create workspace'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

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

  // Load on first render
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
                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                  ws.isActive
                    ? 'bg-[#111520] border-white/5 hover:border-white/10'
                    : 'bg-[#0e1018] border-white/3 opacity-50'
                }`}
              >
                {/* Icon */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                  style={{ background: `${ws.color}18` }}
                >
                  {ws.emoji}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white">{ws.name}</p>
                    <span className="text-[10px] font-mono text-white/25 bg-white/5 px-1.5 py-0.5 rounded">
                      {ws.slug}
                    </span>
                    {!ws.isActive && (
                      <span className="text-[10px] text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">inactive</span>
                    )}
                  </div>
                  <p className="text-xs text-white/35 mt-0.5 truncate">{ws.description || 'No description'}</p>
                </div>

                {/* Color dot */}
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: ws.color, boxShadow: `0 0 8px ${ws.color}60` }}
                />

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setModal({ mode: 'edit', ws })}
                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleToggle(ws)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                      ws.isActive
                        ? 'bg-white/5 hover:bg-amber-500/10 text-white/40 hover:text-amber-400'
                        : 'bg-white/5 hover:bg-emerald-500/10 text-white/40 hover:text-emerald-400'
                    }`}
                    title={ws.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {ws.isActive ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                  </button>
                  {deleteConfirm === ws.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(ws.id)}
                        className="w-8 h-8 rounded-lg bg-red-500/15 text-red-400 flex items-center justify-center hover:bg-red-500/25 transition-all"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="w-8 h-8 rounded-lg bg-white/5 text-white/40 flex items-center justify-center hover:bg-white/10 transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(ws.id)}
                      className="w-8 h-8 rounded-lg bg-white/5 hover:bg-red-500/10 flex items-center justify-center text-white/25 hover:text-red-400 transition-all"
                      title="Remove"
                    >
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

        {/* Tip */}
        <div className="mt-8 p-4 rounded-2xl bg-white/3 border border-white/5 text-xs text-white/30 leading-relaxed">
          <p className="font-semibold text-white/50 mb-1">Tip: Setting unique passwords</p>
          You can also set workspace passwords using environment secrets (GENERAL_PASSWORD, EQUIFIND_PASSWORD, HOME_INSPECTION_PASSWORD) — these override the database values at startup.
          New workspaces you add here store their password directly in the database.
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modal && (
          <WorkspaceModal
            initial={modal.ws}
            onSave={data => {
              if (modal.mode === 'create') handleCreate(data);
              else if (modal.ws) handleUpdate(modal.ws.id, data);
            }}
            onClose={() => setModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
