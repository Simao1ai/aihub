import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Link as LinkIcon, FileUp, Trash2, Search, BrainCircuit, ExternalLink, Plus, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListBrainDocuments,
  useCreateBrainDocument,
  useUploadBrainDocument,
  useDeleteBrainDocument,
  getListBrainDocumentsQueryKey
} from '@workspace/api-client-react';
import { useAppStore } from '@/store';
import { cn } from '@/components/ui-elements';
import type { BrainDocument } from '@workspace/api-client-react';

const CATEGORIES = [
  { key: 'general', label: 'General', color: '#6b7280', bg: '#6b728018' },
  { key: 'processes', label: 'Processes', color: '#6366f1', bg: '#6366f118' },
  { key: 'clients', label: 'Clients', color: '#10b981', bg: '#10b98118' },
  { key: 'products', label: 'Products', color: '#3b82f6', bg: '#3b82f618' },
  { key: 'finance', label: 'Finance', color: '#16a34a', bg: '#16a34a18' },
  { key: 'marketing', label: 'Marketing', color: '#ec4899', bg: '#ec489918' },
  { key: 'legal', label: 'Legal', color: '#64748b', bg: '#64748b18' },
  { key: 'hr', label: 'HR', color: '#7c3aed', bg: '#7c3aed18' },
];

function typeIcon(type: string) {
  if (type === 'pdf') return <FileUp className="w-3.5 h-3.5" />;
  if (type === 'url') return <LinkIcon className="w-3.5 h-3.5" />;
  return <FileText className="w-3.5 h-3.5" />;
}

function categoryConfig(key: string) {
  return CATEGORIES.find(c => c.key === key) ?? CATEGORIES[0];
}

function UploadModal({
  onClose,
  businessTag,
}: {
  onClose: () => void;
  businessTag: string;
}) {
  const queryClient = useQueryClient();
  const createMutation = useCreateBrainDocument();
  const uploadMutation = useUploadBrainDocument();

  const [uploadType, setUploadType] = useState<'text' | 'url' | 'pdf'>('text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState('general');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    const onSuccess = () => {
      queryClient.invalidateQueries({ queryKey: getListBrainDocumentsQueryKey({ businessTag }) });
      onClose();
    };

    if (uploadType === 'pdf' && file) {
      uploadMutation.mutate({ data: { title, file, businessTag } }, { onSuccess });
    } else {
      createMutation.mutate({
        data: {
          title,
          type: uploadType as 'text' | 'url',
          businessTag,
          category,
          ...(uploadType === 'text' ? { content } : { url })
        }
      }, { onSuccess });
    }
  };

  const isLoading = createMutation.isPending || uploadMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-display font-bold text-gray-900">Add to Brain</h2>
          <p className="text-xs text-gray-400 mt-0.5">This content will be available to all AI agents as context</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Type tabs */}
          <div className="flex gap-1 p-1 bg-gray-50 rounded-xl">
            {(['text', 'url', 'pdf'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setUploadType(t)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all",
                  uploadType === t ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-500'
                )}
              >
                {t === 'text' ? <FileText className="w-3.5 h-3.5" /> : t === 'url' ? <LinkIcon className="w-3.5 h-3.5" /> : <FileUp className="w-3.5 h-3.5" />}
                {t === 'text' ? 'Text' : t === 'url' ? 'URL' : 'PDF'}
              </button>
            ))}
          </div>

          {/* Title */}
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Title *</label>
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Our Pricing Guide"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-white/20"
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Category</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setCategory(cat.key)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border",
                    category === cat.key ? 'border-transparent' : 'border-gray-200 text-gray-400 hover:text-gray-500'
                  )}
                  style={category === cat.key ? { background: cat.bg, color: cat.color, borderColor: `${cat.color}40` } : {}}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content input */}
          {uploadType === 'text' && (
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Content</label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Paste your text content here..."
                rows={6}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-white/20 resize-none"
              />
            </div>
          )}
          {uploadType === 'url' && (
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">URL</label>
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-white/20"
              />
            </div>
          )}
          {uploadType === 'pdf' && (
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">PDF file</label>
              <label className="flex flex-col items-center justify-center w-full h-24 border border-dashed border-white/15 rounded-xl cursor-pointer hover:border-white/25 transition-colors">
                <FileUp className="w-6 h-6 text-gray-400 mb-1" />
                <span className="text-xs text-gray-400">{file ? file.name : 'Click to upload PDF (max 20 MB)'}</span>
                <input type="file" accept=".pdf" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-900 text-sm transition-all">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title || isLoading}
              className="flex-1 py-2.5 rounded-xl bg-primary text-gray-900 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all"
            >
              {isLoading ? 'Adding...' : 'Add to Brain'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function EditModal({ doc, businessTag, onClose }: { doc: BrainDocument; businessTag: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(doc.title);
  const [content, setContent] = useState(doc.content);
  const [category, setCategory] = useState(doc.category ?? 'general');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/brain/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content, category }),
      });
      if (!res.ok) throw new Error(await res.text());
      queryClient.invalidateQueries({ queryKey: getListBrainDocumentsQueryKey({ businessTag }) });
      onClose();
    } catch {
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-display font-bold text-gray-900">Edit Document</h2>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{doc.title}</p>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Title *</label>
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-white/20"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Category</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setCategory(cat.key)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border",
                    category === cat.key ? 'border-transparent' : 'border-gray-200 text-gray-400 hover:text-gray-500'
                  )}
                  style={category === cat.key ? { background: cat.bg, color: cat.color, borderColor: `${cat.color}40` } : {}}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Content</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={8}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-white/20 resize-none font-mono text-xs"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-900 text-sm transition-all">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || saving}
              className="flex-1 py-2.5 rounded-xl bg-primary text-gray-900 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function Brain() {
  const { businessTag } = useAppStore();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [editDoc, setEditDoc] = useState<BrainDocument | null>(null);

  const { data: documents = [], isLoading } = useListBrainDocuments({ businessTag });
  const deleteMutation = useDeleteBrainDocument();

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListBrainDocumentsQueryKey({ businessTag }) });
        setDeleteConfirm(null);
      }
    });
  };

  const filtered = documents.filter(doc => {
    const matchSearch = !searchQuery ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = activeCategory === 'all' || (doc as any).category === activeCategory;
    return matchSearch && matchCat;
  });

  const countByCategory = (key: string) => documents.filter(d => (d as any).category === key).length;

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 sm:px-8 pt-4 sm:pt-8 pb-4 sm:pb-5 bg-[#f8fafc]/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-display font-bold text-gray-900 flex items-center gap-2.5">
                <BrainCircuit className="w-6 h-6 text-primary" /> Brain
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">
                {documents.length} document{documents.length !== 1 ? 's' : ''} · automatically injected into AI conversations
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-gray-900 text-sm font-semibold hover:bg-primary/90 transition-all"
            >
              <Plus className="w-4 h-4" /> Add document
            </button>
          </div>

          {/* Search + category filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search knowledge base..."
                className="bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary/40 w-52"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setActiveCategory('all')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  activeCategory === 'all' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-500'
                )}
              >
                All ({documents.length})
              </button>
              {CATEGORIES.map(cat => {
                const count = countByCategory(cat.key);
                if (count === 0 && activeCategory !== cat.key) return null;
                return (
                  <button
                    key={cat.key}
                    onClick={() => setActiveCategory(cat.key)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                      activeCategory === cat.key ? '' : 'text-gray-400 hover:text-gray-500'
                    )}
                    style={activeCategory === cat.key ? { background: cat.bg, color: cat.color } : {}}
                  >
                    {cat.label} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-8 py-4 sm:py-6 max-w-5xl mx-auto">
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map(i => <div key={i} className="h-20 bg-gray-50 rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-300">
            <BrainCircuit className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">{searchQuery ? 'No documents match' : 'Brain is empty — add your first document'}</p>
            {!searchQuery && (
              <button onClick={() => setIsModalOpen(true)} className="mt-3 text-primary text-sm hover:underline">
                Add a document
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            <AnimatePresence mode="popLayout">
              {filtered.map(doc => {
                const cat = categoryConfig((doc as any).category ?? 'general');
                return (
                  <motion.div
                    key={doc.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-xl hover:border-gray-200 transition-all group"
                  >
                    {/* Icon */}
                    <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 shrink-0">
                      {typeIcon(doc.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-gray-900 truncate">{doc.title}</p>
                        <span
                          className="text-[10px] font-medium px-2 py-0.5 rounded-md shrink-0"
                          style={{ background: cat.bg, color: cat.color }}
                        >
                          {cat.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 truncate">{doc.content.slice(0, 120)}...</p>
                    </div>

                    {/* Meta */}
                    <div className="hidden md:flex items-center gap-3 shrink-0">
                      <span className="text-[11px] text-gray-300">{format(new Date(doc.createdAt), 'MMM d, yyyy')}</span>
                      <span className="text-[10px] text-gray-300 uppercase bg-gray-50 px-2 py-0.5 rounded-md">{doc.type}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {doc.type === 'url' && (doc as any).metadata?.url && (
                        <a
                          href={(doc as any).metadata.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        onClick={() => setEditDoc(doc as BrainDocument)}
                        className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all"
                        title="Edit document"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {deleteConfirm === doc.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 text-xs font-medium hover:bg-red-500/25"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-3 py-1.5 rounded-lg bg-gray-50 text-gray-400 text-xs font-medium hover:bg-gray-100"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(doc.id)}
                          className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-red-500/10 flex items-center justify-center text-gray-400 hover:text-red-400 transition-all"
                          title="Delete document"
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
        {isModalOpen && (
          <UploadModal businessTag={businessTag} onClose={() => setIsModalOpen(false)} />
        )}
        {editDoc && (
          <EditModal doc={editDoc} businessTag={businessTag} onClose={() => setEditDoc(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
