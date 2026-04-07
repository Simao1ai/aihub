import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import {
  Zap, Play, Check, Search, Filter, Sparkles,
  ChevronRight, Clock, ArrowRight, Bot
} from 'lucide-react';
import { useAppStore } from '@/store';
import { cn } from '@/components/ui-elements';

interface Template {
  id: number;
  name: string;
  description: string;
  category: string;
  agentSlug: string;
  emoji: string;
  useCases: string[];
  promptTemplate: string;
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  content: { label: 'Content', color: '#10b981', bg: '#10b98115' },
  strategy: { label: 'Strategy', color: '#6366f1', bg: '#6366f115' },
  sales: { label: 'Sales', color: '#f59e0b', bg: '#f59e0b15' },
  marketing: { label: 'Marketing', color: '#ec4899', bg: '#ec489915' },
  finance: { label: 'Finance', color: '#16a34a', bg: '#16a34a15' },
  support: { label: 'Support', color: '#06b6d4', bg: '#06b6d415' },
  hr: { label: 'HR', color: '#7c3aed', bg: '#7c3aed15' },
  legal: { label: 'Legal', color: '#64748b', bg: '#64748b15' },
  operations: { label: 'Operations', color: '#8b5cf6', bg: '#8b5cf615' },
  general: { label: 'General', color: '#6b7280', bg: '#6b728015' },
};

const AGENT_CONFIG: Record<string, { name: string; emoji: string; color: string }> = {
  compass: { name: 'COMPASS', emoji: '🧭', color: '#6366f1' },
  outreach: { name: 'OUTREACH', emoji: '📬', color: '#f59e0b' },
  inkwell: { name: 'INKWELL', emoji: '✍️', color: '#10b981' },
  scout: { name: 'SCOUT', emoji: '🔍', color: '#3b82f6' },
  ops: { name: 'OPS', emoji: '⚙️', color: '#8b5cf6' },
  desk: { name: 'DESK', emoji: '💬', color: '#ef4444' },
  cassie: { name: 'CASSIE', emoji: '🎧', color: '#06b6d4' },
  soshi: { name: 'SOSHI', emoji: '📱', color: '#ec4899' },
  finn: { name: 'FINN', emoji: '💰', color: '#16a34a' },
  seomi: { name: 'SEOMI', emoji: '🔎', color: '#f97316' },
  dexie: { name: 'DEXIE', emoji: '📊', color: '#0ea5e9' },
  emma: { name: 'EMMA', emoji: '📧', color: '#a855f7' },
  milli: { name: 'MILLI', emoji: '🏆', color: '#dc2626' },
  hiro: { name: 'HIRO', emoji: '👥', color: '#7c3aed' },
  lex: { name: 'LEX', emoji: '⚖️', color: '#64748b' },
  nova: { name: 'NOVA', emoji: '🗂️', color: '#0891b2' },
};

function TemplateCard({ template, onActivate, onRunNow, activated }: {
  template: Template;
  onActivate: () => void;
  onRunNow: () => void;
  activated: boolean;
}) {
  const cat = CATEGORY_CONFIG[template.category] ?? CATEGORY_CONFIG.general;
  const agent = AGENT_CONFIG[template.agentSlug];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col bg-[#111520] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all group"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{template.emoji}</div>
          <div>
            <h3 className="text-sm font-display font-bold text-white/90 leading-tight">{template.name}</h3>
            <span
              className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-md mt-1"
              style={{ background: cat.bg, color: cat.color }}
            >
              {cat.label}
            </span>
          </div>
        </div>
        {activated && (
          <div className="flex items-center gap-1 text-emerald-400 text-xs font-medium shrink-0">
            <Check className="w-3.5 h-3.5" /> Saved
          </div>
        )}
      </div>

      {/* Description */}
      <p className="text-xs text-white/45 leading-relaxed mb-3 flex-1">{template.description}</p>

      {/* Use cases */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {(template.useCases ?? []).map(uc => (
          <span key={uc} className="text-[10px] text-white/30 bg-white/5 px-2 py-0.5 rounded-md">{uc}</span>
        ))}
      </div>

      {/* Agent badge */}
      {agent && (
        <div className="flex items-center gap-1.5 mb-3 text-xs" style={{ color: agent.color }}>
          <span>{agent.emoji}</span>
          <span className="font-semibold">{agent.name}</span>
          <span className="text-white/25">agent</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-auto">
        <button
          onClick={onRunNow}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-primary text-white hover:bg-primary/90 transition-all"
        >
          <Play className="w-3.5 h-3.5" /> Run Now
        </button>
        <button
          onClick={onActivate}
          disabled={activated}
          className={cn(
            "flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-all",
            activated
              ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10 cursor-default'
              : 'border-white/10 text-white/50 hover:text-white hover:border-white/20'
          )}
        >
          {activated ? <Check className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
          {activated ? 'Saved' : 'Save'}
        </button>
      </div>
    </motion.div>
  );
}

export default function PowerUps() {
  const { businessTag } = useAppStore();
  const [, setLocation] = useLocation();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activatedIds, setActivatedIds] = useState<Set<number>>(new Set());
  const [runningId, setRunningId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/power-ups');
      setTemplates(await res.json());
    } catch { setTemplates([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleActivate = async (template: Template) => {
    try {
      const res = await fetch(`/api/power-ups/${template.id}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessTag }),
      });
      if (!res.ok) throw new Error();
      setActivatedIds(prev => new Set([...prev, template.id]));
      showToast(`"${template.name}" saved to Automations!`);
    } catch {
      showToast('Failed to save automation', 'error');
    }
  };

  const handleRunNow = async (template: Template) => {
    setRunningId(template.id);
    try {
      const res = await fetch(`/api/power-ups/${template.id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessTag }),
      });
      if (!res.ok) throw new Error();
      showToast(`Running "${template.name}" — check Automations for output!`);
      setTimeout(() => setLocation('/automations'), 2000);
    } catch {
      showToast('Failed to run automation', 'error');
    } finally {
      setRunningId(null);
    }
  };

  const categories = ['all', ...Array.from(new Set(templates.map(t => t.category)))];

  const filtered = templates.filter(t => {
    const matchSearch = !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'all' || t.category === activeCategory;
    return matchSearch && matchCat;
  });

  const grouped = filtered.reduce((acc, t) => {
    const cat = t.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {} as Record<string, Template[]>);

  const showGrouped = activeCategory === 'all' && !search;

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 px-8 pt-8 pb-5 bg-[#0c0e16]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2.5">
                <Zap className="w-6 h-6 text-primary" /> Power-Ups
              </h1>
              <p className="text-sm text-white/35 mt-0.5">
                {templates.length} one-click automation templates · Run instantly or save to Automations
              </p>
            </div>
          </div>

          {/* Search + filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search templates..."
                className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-primary/40 w-52"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {categories.map(cat => {
                const cfg = CATEGORY_CONFIG[cat];
                const count = cat === 'all' ? templates.length : templates.filter(t => t.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize",
                      activeCategory === cat ? 'text-white' : 'text-white/35 hover:text-white/60'
                    )}
                    style={activeCategory === cat && cfg ? { background: cfg.bg, color: cfg.color } : {}}
                  >
                    {cat === 'all' ? 'All' : cfg?.label ?? cat} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 py-8 max-w-5xl mx-auto">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(9).fill(0).map((_, i) => (
              <div key={i} className="h-56 bg-white/3 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : showGrouped ? (
          <div className="space-y-10">
            {Object.entries(grouped).map(([cat, items]) => {
              const cfg = CATEGORY_CONFIG[cat] ?? CATEGORY_CONFIG.general;
              return (
                <div key={cat}>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: cfg.color }}>
                      {cfg.label}
                    </span>
                    <div className="flex-1 h-px" style={{ background: `${cfg.color}25` }} />
                    <span className="text-xs text-white/25">{items.length}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map(t => (
                      <TemplateCard
                        key={t.id}
                        template={t}
                        activated={activatedIds.has(t.id)}
                        onActivate={() => handleActivate(t)}
                        onRunNow={() => handleRunNow(t)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(t => (
              <TemplateCard
                key={t.id}
                template={t}
                activated={activatedIds.has(t.id)}
                onActivate={() => handleActivate(t)}
                onRunNow={() => handleRunNow(t)}
              />
            ))}
            {filtered.length === 0 && (
              <div className="col-span-3 text-center py-16 text-white/20">
                <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No templates match your search</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={cn(
              "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-2xl flex items-center gap-2",
              toast.type === 'success'
                ? 'bg-emerald-500 text-white'
                : 'bg-red-500 text-white'
            )}
          >
            {toast.type === 'success' ? <Check className="w-4 h-4" /> : null}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
