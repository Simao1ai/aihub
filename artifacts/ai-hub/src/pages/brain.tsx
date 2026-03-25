import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Link as LinkIcon, FileUp, Trash2, Search, BrainCircuit, ExternalLink } from 'lucide-react';
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
import { Button, Card, Input, Badge, Modal, cn } from '@/components/ui-elements';

export default function Brain() {
  const { businessTag } = useAppStore();
  const queryClient = useQueryClient();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadType, setUploadType] = useState<'text' | 'url' | 'pdf'>('text');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const { data: documents = [], isLoading } = useListBrainDocuments({ businessTag });
  const createMutation = useCreateBrainDocument();
  const uploadMutation = useUploadBrainDocument();
  const deleteMutation = useDeleteBrainDocument();

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    const onSuccess = () => {
      queryClient.invalidateQueries({ queryKey: getListBrainDocumentsQueryKey({ businessTag }) });
      setIsUploadModalOpen(false);
      setTitle(''); setContent(''); setUrl(''); setFile(null);
    };

    if (uploadType === 'pdf' && file) {
      uploadMutation.mutate({
        data: { title, file, businessTag }
      }, { onSuccess });
    } else {
      createMutation.mutate({
        data: {
          title,
          type: uploadType as 'text' | 'url',
          businessTag,
          ...(uploadType === 'text' ? { content } : { url })
        }
      }, { onSuccess });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this document from the brain?')) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListBrainDocumentsQueryKey({ businessTag }) })
      });
    }
  };

  const filteredDocs = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    doc.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-display font-bold text-white flex items-center gap-3">
            <BrainCircuit className="text-primary w-8 h-8" />
            Knowledge Base
          </h2>
          <p className="text-muted-foreground mt-1">Manage contextual memory for your AI agents.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search documents..." 
              className="pl-9 bg-card/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={() => setIsUploadModalOpen(true)} className="shrink-0">
            <FileUp className="w-4 h-4 mr-2" /> Inject Data
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-32 bg-card/50 rounded-2xl animate-pulse" />)}
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border-2 border-dashed border-border rounded-2xl bg-card/20">
            <BrainCircuit className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium text-white/70">The brain is empty.</p>
            <p className="text-sm mt-1">Inject data to give your agents context.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocs.map(doc => (
              <motion.div key={doc.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <Card className="p-5 flex flex-col h-full hover:border-primary/30 transition-colors group">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      {doc.type === 'pdf' && <div className="p-2 bg-red-500/10 text-red-400 rounded-lg"><FileText className="w-4 h-4" /></div>}
                      {doc.type === 'url' && <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg"><LinkIcon className="w-4 h-4" /></div>}
                      {doc.type === 'text' && <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg"><FileText className="w-4 h-4" /></div>}
                    </div>
                    <button 
                      onClick={() => handleDelete(doc.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <h3 className="font-semibold text-white/90 line-clamp-1 mb-1" title={doc.title}>{doc.title}</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Added {format(new Date(doc.createdAt), 'MMM d, yyyy')}
                  </p>
                  
                  <div className="mt-auto pt-4 border-t border-border/50 flex items-center justify-between">
                    <Badge variant="outline" className="capitalize">{doc.type}</Badge>
                    {doc.type === 'url' && (
                      <a href={doc.content} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center">
                        Visit <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} title="Inject Data to Brain">
        <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 mb-6">
          {(['text', 'url', 'pdf'] as const).map(type => (
            <button
              key={type}
              onClick={() => setUploadType(type)}
              className={cn(
                "flex-1 py-2 text-sm font-medium rounded-lg transition-all capitalize",
                uploadType === type ? "bg-secondary text-white shadow" : "text-muted-foreground hover:text-white"
              )}
            >
              {type}
            </button>
          ))}
        </div>

        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">Document Title</label>
            <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Q3 Financial Report" />
          </div>

          {uploadType === 'text' && (
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">Raw Text Content</label>
              <textarea 
                required 
                value={content} 
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-32 bg-black/20 border border-border rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 resize-none"
                placeholder="Paste context here..."
              />
            </div>
          )}

          {uploadType === 'url' && (
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">Source URL</label>
              <Input required type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
            </div>
          )}

          {uploadType === 'pdf' && (
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">PDF File</label>
              <Input 
                required 
                type="file" 
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)} 
                className="py-2"
              />
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setIsUploadModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending || uploadMutation.isPending}>
              Inject to Brain
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
