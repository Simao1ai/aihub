import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  Users, Plus, Trash2, Pencil, Search, Mail,
  Phone, Building2, Tag, X, Check
} from 'lucide-react';
import { useAppStore } from '@/store';
import { cn } from '@/components/ui-elements';

type ContactStatus = 'lead' | 'prospect' | 'client' | 'partner';

interface Contact {
  id: number;
  name: string;
  company: string;
  email: string;
  phone: string;
  status: ContactStatus;
  notes: string;
  businessTag: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<ContactStatus, { label: string; color: string; bg: string }> = {
  lead: { label: 'Lead', color: '#6b7280', bg: '#6b728020' },
  prospect: { label: 'Prospect', color: '#f59e0b', bg: '#f59e0b20' },
  client: { label: 'Client', color: '#10b981', bg: '#10b98120' },
  partner: { label: 'Partner', color: '#6366f1', bg: '#6366f120' },
};

function ContactModal({
  initial,
  businessTag,
  onSave,
  onClose,
}: {
  initial?: Partial<Contact>;
  businessTag: string;
  onSave: (data: Partial<Contact>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    company: initial?.company ?? '',
    email: initial?.email ?? '',
    phone: initial?.phone ?? '',
    status: (initial?.status ?? 'lead') as ContactStatus,
    notes: initial?.notes ?? '',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-[#131622] border border-white/10 rounded-2xl shadow-2xl p-6"
      >
        <h2 className="text-base font-display font-bold text-white mb-5">
          {initial?.id ? 'Edit contact' : 'New contact'}
        </h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-white/40 font-medium mb-1.5 block">Full name *</label>
              <input
                autoFocus
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Jane Smith"
                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20"
              />
            </div>
            <div>
              <label className="text-xs text-white/40 font-medium mb-1.5 block">Company</label>
              <input
                value={form.company}
                onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                placeholder="Acme Realty"
                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20"
              />
            </div>
            <div>
              <label className="text-xs text-white/40 font-medium mb-1.5 block">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as ContactStatus }))}
                className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/20"
              >
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/40 font-medium mb-1.5 block">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="jane@example.com"
                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20"
              />
            </div>
            <div>
              <label className="text-xs text-white/40 font-medium mb-1.5 block">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="(555) 000-0000"
                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-white/40 font-medium mb-1.5 block">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Anything worth remembering..."
              rows={3}
              className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 resize-none"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/8 text-white/50 hover:text-white text-sm font-medium transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => { if (!form.name.trim()) return; onSave({ ...form, businessTag }); }}
              className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all"
            >
              {initial?.id ? 'Save changes' : 'Add contact'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function Contacts() {
  const { businessTag } = useAppStore();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<ContactStatus | 'all'>('all');
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; contact?: Contact } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/contacts?businessTag=${businessTag}`);
      setContacts(await res.json());
    } catch {
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, [businessTag]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (data: Partial<Contact>) => {
    await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setModal(null);
    load();
  };

  const handleUpdate = async (id: number, data: Partial<Contact>) => {
    await fetch(`/api/contacts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setModal(null);
    load();
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
    setDeleteConfirm(null);
    load();
  };

  const filtered = contacts.filter(c => {
    const matchSearch = !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const countByStatus = (s: ContactStatus) => contacts.filter(c => c.status === s).length;

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 px-8 pt-8 pb-5 bg-[#0c0e16]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2.5">
              <Users className="w-6 h-6 text-primary" /> Contacts
            </h1>
            <p className="text-sm text-white/35 mt-0.5">{contacts.length} contact{contacts.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search contacts..."
                className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-primary/40 w-48"
              />
            </div>
            <button
              onClick={() => setModal({ mode: 'create' })}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all shrink-0"
            >
              <Plus className="w-4 h-4" /> Add contact
            </button>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 max-w-5xl mx-auto">
        {/* Status filter pills */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setFilterStatus('all')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              filterStatus === 'all' ? 'bg-white/10 text-white' : 'text-white/35 hover:text-white/60'
            )}
          >
            All ({contacts.length})
          </button>
          {(Object.keys(STATUS_CONFIG) as ContactStatus[]).map(s => {
            const cfg = STATUS_CONFIG[s];
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  filterStatus === s ? 'text-white' : 'text-white/35 hover:text-white/60'
                )}
                style={filterStatus === s ? { background: cfg.bg, color: cfg.color } : {}}
              >
                {cfg.label} ({countByStatus(s)})
              </button>
            );
          })}
        </div>

        {/* Contact table */}
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map(i => <div key={i} className="h-16 bg-white/3 rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/20">
            <Users className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">{search ? 'No contacts match your search' : 'No contacts yet'}</p>
            {!search && (
              <button onClick={() => setModal({ mode: 'create' })} className="mt-3 text-primary text-sm hover:underline">
                Add your first contact
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {filtered.map(contact => {
                const cfg = STATUS_CONFIG[contact.status];
                return (
                  <motion.div
                    key={contact.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    className="flex items-center gap-4 p-4 bg-[#111520] border border-white/5 rounded-xl hover:border-white/10 transition-all group"
                  >
                    {/* Avatar */}
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 text-white"
                      style={{ background: cfg.bg, color: cfg.color }}
                    >
                      {contact.name.slice(0, 1).toUpperCase()}
                    </div>

                    {/* Name + company */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{contact.name}</p>
                      {contact.company && (
                        <p className="text-xs text-white/35 truncate flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3" /> {contact.company}
                        </p>
                      )}
                    </div>

                    {/* Status badge */}
                    <span
                      className="text-[11px] font-medium px-2.5 py-1 rounded-lg shrink-0"
                      style={{ background: cfg.bg, color: cfg.color }}
                    >
                      {cfg.label}
                    </span>

                    {/* Email */}
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        className="hidden md:flex items-center gap-1.5 text-xs text-white/35 hover:text-primary transition-colors shrink-0"
                        onClick={e => e.stopPropagation()}
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span className="max-w-[140px] truncate">{contact.email}</span>
                      </a>
                    )}

                    {/* Phone */}
                    {contact.phone && (
                      <a
                        href={`tel:${contact.phone}`}
                        className="hidden lg:flex items-center gap-1.5 text-xs text-white/35 hover:text-primary transition-colors shrink-0"
                        onClick={e => e.stopPropagation()}
                      >
                        <Phone className="w-3.5 h-3.5" /> {contact.phone}
                      </a>
                    )}

                    {/* Added date */}
                    <span className="hidden xl:block text-[11px] text-white/20 shrink-0">
                      {format(new Date(contact.createdAt), 'MMM d')}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => setModal({ mode: 'edit', contact })}
                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {deleteConfirm === contact.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDelete(contact.id)}
                            className="w-8 h-8 rounded-lg bg-red-500/15 text-red-400 flex items-center justify-center hover:bg-red-500/25"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="w-8 h-8 rounded-lg bg-white/5 text-white/40 flex items-center justify-center hover:bg-white/10"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(contact.id)}
                          className="w-8 h-8 rounded-lg bg-white/5 hover:bg-red-500/10 flex items-center justify-center text-white/25 hover:text-red-400 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {modal && (
          <ContactModal
            initial={modal.contact}
            businessTag={businessTag}
            onSave={data => {
              if (modal.mode === 'create') handleCreate(data);
              else if (modal.contact) handleUpdate(modal.contact.id, data);
            }}
            onClose={() => setModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
