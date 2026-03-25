import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link2, Mail, Twitter, Linkedin, Facebook, MessageCircle, Key, Trash2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  useListConnections, 
  useCreateConnection, 
  useDeleteConnection, 
  useInitiateOAuth,
  useTestConnection,
  getListConnectionsQueryKey
} from '@workspace/api-client-react';
import { Button, Card, Badge, Modal, Input, cn } from '@/components/ui-elements';

const PLATFORM_CONFIG = {
  linkedin: { icon: Linkedin, color: '#0a66c2', name: 'LinkedIn' },
  twitter: { icon: Twitter, color: '#1da1f2', name: 'X / Twitter' },
  google: { icon: Mail, color: '#ea4335', name: 'Gmail / Google' },
  meta: { icon: Facebook, color: '#1877f2', name: 'Meta (FB/IG)' },
  gohighlevel: { icon: MessageCircle, color: '#0052cc', name: 'GoHighLevel' },
  email: { icon: Mail, color: '#6366f1', name: 'SMTP Email' }
};

export default function Connections() {
  const queryClient = useQueryClient();
  const { data: connections = [] } = useListConnections();
  
  const createMutation = useCreateConnection();
  const deleteMutation = useDeleteConnection();
  const testMutation = useTestConnection();
  
  const [apiKeyModal, setApiKeyModal] = useState<{ isOpen: boolean, platform: 'gohighlevel' | 'email' | null }>({ isOpen: false, platform: null });
  const [apiKey, setApiKey] = useState('');

  const handleOAuthConnect = async (platform: 'linkedin' | 'google' | 'twitter' | 'meta') => {
    try {
      const res = await fetch(`/api/connections/oauth/${platform}/initiate`);
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      console.error('OAuth initiation failed', e);
    }
  };

  const handleApiKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyModal.platform || !apiKey) return;
    
    createMutation.mutate({
      data: { platform: apiKeyModal.platform, apiKey }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListConnectionsQueryKey() });
        setApiKeyModal({ isOpen: false, platform: null });
        setApiKey('');
      }
    });
  };

  const handleDisconnect = (id: number) => {
    if (confirm('Are you sure you want to disconnect this platform? Automations using it will fail.')) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListConnectionsQueryKey() })
      });
    }
  };

  const handleTest = (id: number) => {
    testMutation.mutate({ id });
  };

  return (
    <div className="h-full overflow-y-auto p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-display font-bold text-white flex items-center gap-3">
          <Link2 className="text-primary w-8 h-8" />
          Integrations
        </h2>
        <p className="text-muted-foreground mt-1">Connect external platforms to enable agents to take action.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(PLATFORM_CONFIG).map(([platKey, config]) => {
          const plat = platKey as keyof typeof PLATFORM_CONFIG;
          const connection = connections.find(c => c.platform === plat);
          const Icon = config.icon;

          return (
            <Card key={plat} className="p-6 relative overflow-hidden group">
              {/* Decorative background glow based on platform color */}
              <div 
                className="absolute -right-12 -top-12 w-32 h-32 blur-[50px] opacity-10 pointer-events-none transition-opacity group-hover:opacity-20" 
                style={{ backgroundColor: config.color }} 
              />
              
              <div className="flex justify-between items-start mb-6">
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg"
                  style={{ backgroundColor: config.color }}
                >
                  <Icon className="w-7 h-7" />
                </div>
                {connection ? (
                  <Badge variant="success" className="bg-emerald-500/15 border-emerald-500/30 text-emerald-400">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
                  </Badge>
                ) : (
                  <Badge variant="outline">Not Connected</Badge>
                )}
              </div>

              <h3 className="text-xl font-bold text-white mb-1">{config.name}</h3>
              <p className="text-sm text-muted-foreground mb-6">
                {connection?.accountLabel || `Connect to automate actions via ${config.name}.`}
              </p>

              <div className="pt-4 border-t border-border/50 flex items-center justify-between">
                {connection ? (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => handleTest(connection.id)} disabled={testMutation.isPending}>
                      <RefreshCw className={cn("w-4 h-4 mr-2", testMutation.isPending && "animate-spin")} /> Test
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDisconnect(connection.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <Button 
                    className="w-full"
                    onClick={() => {
                      if (['gohighlevel', 'email'].includes(plat)) {
                        setApiKeyModal({ isOpen: true, platform: plat as any });
                      } else {
                        handleOAuthConnect(plat as any);
                      }
                    }}
                  >
                    {['gohighlevel', 'email'].includes(plat) ? (
                      <><Key className="w-4 h-4 mr-2" /> Enter API Key</>
                    ) : (
                      <><Link2 className="w-4 h-4 mr-2" /> OAuth Connect</>
                    )}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Modal isOpen={apiKeyModal.isOpen} onClose={() => setApiKeyModal({ isOpen: false, platform: null })} title="Connect with API Key">
        <form onSubmit={handleApiKeySubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enter your API key for {apiKeyModal.platform === 'gohighlevel' ? 'GoHighLevel' : 'SMTP Email'}. 
            This will be stored securely and used by your agents to execute automations.
          </p>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">API Key</label>
            <Input 
              type="password"
              required 
              value={apiKey} 
              onChange={(e) => setApiKey(e.target.value)} 
              placeholder="sk_live_..." 
            />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setApiKeyModal({ isOpen: false, platform: null })}>Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending}>Connect</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
