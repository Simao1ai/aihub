import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  CheckSquare, Plus, Trash2, Pencil, Check, X,
  Clock, AlertCircle, ChevronDown, GripVertical
} from 'lucide-react';
import { useAppStore } from '@/store';
import { cn } from '@/components/ui-elements';

type Status = 'todo' | 'in_progress' | 'done';
type Priority = 'low' | 'medium' | 'high';

interface Task {
  id: number;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  businessTag: string;
  dueDate: string | null;
  createdAt: string;
}

const STATUSES: { key: Status; label: string; color: string; bg: string }[] = [
  { key: 'todo', label: 'To Do', color: '#6b7280', bg: '#6b728015' },
  { key: 'in_progress', label: 'In Progress', color: '#f59e0b', bg: '#f59e0b15' },
  { key: 'done', label: 'Done', color: '#10b981', bg: '#10b98115' },
];

const PRIORITIES: { key: Priority; label: string; color: string }[] = [
  { key: 'low', label: 'Low', color: '#6b7280' },
  { key: 'medium', label: 'Medium', color: '#f59e0b' },
  { key: 'high', label: 'High', color: '#ef4444' },
];

function priorityColor(p: Priority) {
  return PRIORITIES.find(x => x.key === p)?.color ?? '#6b7280';
}

function TaskModal({
  initial,
  businessTag,
  onSave,
  onClose,
}: {
  initial?: Partial<Task>;
  businessTag: string;
  onSave: (data: Partial<Task>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    status: (initial?.status ?? 'todo') as Status,
    priority: (initial?.priority ?? 'medium') as Priority,
    dueDate: initial?.dueDate ?? '',
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
          {initial?.id ? 'Edit task' : 'New task'}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-white/40 font-medium mb-1.5 block">Title *</label>
            <input
              autoFocus
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="What needs to be done?"
              className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20"
            />
          </div>
          <div>
            <label className="text-xs text-white/40 font-medium mb-1.5 block">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Add more detail..."
              rows={3}
              className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/40 font-medium mb-1.5 block">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as Status }))}
                className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/20"
              >
                {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/40 font-medium mb-1.5 block">Priority</label>
              <select
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))}
                className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/20"
              >
                {PRIORITIES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-white/40 font-medium mb-1.5 block">Due date</label>
            <input
              type="date"
              value={form.dueDate ?? ''}
              onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
              className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/20 [color-scheme:dark]"
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
              onClick={() => { if (!form.title.trim()) return; onSave({ ...form, businessTag }); }}
              className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all"
            >
              {initial?.id ? 'Save changes' : 'Create task'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function Tasks() {
  const { businessTag } = useAppStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; task?: Task } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks?businessTag=${businessTag}`);
      setTasks(await res.json());
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [businessTag]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (data: Partial<Task>) => {
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setModal(null);
    load();
  };

  const handleUpdate = async (id: number, data: Partial<Task>) => {
    await fetch(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setModal(null);
    load();
  };

  const handleStatusChange = async (task: Task, status: Status) => {
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    load();
  };

  const tasksByStatus = (status: Status) => tasks.filter(t => t.status === status);

  const isOverdue = (task: Task) => {
    if (!task.dueDate || task.status === 'done') return false;
    return new Date(task.dueDate) < new Date();
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 px-8 pt-8 pb-5 bg-[#0c0e16]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2.5">
              <CheckSquare className="w-6 h-6 text-primary" /> Tasks
            </h1>
            <p className="text-sm text-white/35 mt-0.5">{tasks.length} task{tasks.length !== 1 ? 's' : ''} · {tasksByStatus('done').length} done</p>
          </div>
          <button
            onClick={() => setModal({ mode: 'create' })}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all"
          >
            <Plus className="w-4 h-4" /> New task
          </button>
        </div>
      </div>

      <div className="px-8 py-8 max-w-6xl mx-auto">
        {loading ? (
          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2].map(i => <div key={i} className="h-48 bg-white/3 rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {STATUSES.map(col => {
              const colTasks = tasksByStatus(col.key);
              return (
                <div key={col.key} className="flex flex-col gap-3">
                  {/* Column header */}
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                    <span className="text-xs font-semibold text-white/50 uppercase tracking-wide">{col.label}</span>
                    <span className="ml-auto text-xs text-white/25 bg-white/5 px-2 py-0.5 rounded-full">{colTasks.length}</span>
                  </div>

                  {/* Tasks */}
                  <div className="flex flex-col gap-2.5 min-h-[120px]">
                    <AnimatePresence mode="popLayout">
                      {colTasks.map(task => (
                        <motion.div
                          key={task.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="bg-[#111520] border border-white/5 rounded-xl p-4 hover:border-white/10 transition-all group"
                        >
                          <div className="flex items-start gap-2 mb-2">
                            {/* Done toggle */}
                            <button
                              onClick={() => handleStatusChange(task, task.status === 'done' ? 'todo' : 'done')}
                              className={cn(
                                "w-4.5 h-4.5 mt-0.5 rounded border flex items-center justify-center shrink-0 transition-all",
                                task.status === 'done'
                                  ? 'bg-emerald-500 border-emerald-500'
                                  : 'border-white/20 hover:border-emerald-500/50'
                              )}
                            >
                              {task.status === 'done' && <Check className="w-2.5 h-2.5 text-white" />}
                            </button>
                            <p className={cn(
                              "text-sm font-medium flex-1 leading-snug",
                              task.status === 'done' ? 'text-white/30 line-through' : 'text-white/90'
                            )}>
                              {task.title}
                            </p>
                          </div>

                          {task.description && (
                            <p className="text-xs text-white/35 ml-6 mb-2 leading-relaxed line-clamp-2">{task.description}</p>
                          )}

                          <div className="flex items-center gap-2 ml-6">
                            {/* Priority dot */}
                            <div
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: priorityColor(task.priority) }}
                              title={task.priority}
                            />
                            <span className="text-[10px] text-white/30 capitalize">{task.priority}</span>

                            {/* Due date */}
                            {task.dueDate && (
                              <span className={cn(
                                "flex items-center gap-1 text-[10px] ml-auto",
                                isOverdue(task) ? 'text-red-400' : 'text-white/30'
                              )}>
                                {isOverdue(task) && <AlertCircle className="w-3 h-3" />}
                                <Clock className="w-3 h-3" />
                                {format(new Date(task.dueDate + 'T00:00:00'), 'MMM d')}
                              </span>
                            )}

                            {/* Column mover */}
                            {col.key !== 'todo' && (
                              <button
                                onClick={() => handleStatusChange(task, col.key === 'in_progress' ? 'todo' : 'in_progress')}
                                className="ml-1 text-[10px] text-white/20 hover:text-white/50 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                ← Back
                              </button>
                            )}
                            {col.key !== 'done' && (
                              <button
                                onClick={() => handleStatusChange(task, col.key === 'todo' ? 'in_progress' : 'done')}
                                className="text-[10px] text-white/20 hover:text-white/50 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                Next →
                              </button>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex gap-1 mt-3 pt-2.5 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setModal({ mode: 'edit', task })}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-white/30 hover:text-white hover:bg-white/5 text-[11px] transition-all"
                            >
                              <Pencil className="w-3 h-3" /> Edit
                            </button>
                            <button
                              onClick={() => handleDelete(task.id)}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 text-[11px] transition-all ml-auto"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {/* Add in column */}
                    <button
                      onClick={() => setModal({ mode: 'create' })}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-white/8 text-white/25 hover:text-white/50 hover:border-white/15 text-xs transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add task
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {modal && (
          <TaskModal
            initial={modal.task}
            businessTag={businessTag}
            onSave={data => {
              if (modal.mode === 'create') handleCreate(data);
              else if (modal.task) handleUpdate(modal.task.id, data);
            }}
            onClose={() => setModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
