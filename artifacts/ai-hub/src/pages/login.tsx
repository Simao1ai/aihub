import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Command, Lock, ArrowRight } from 'lucide-react';
import { Input, Button } from '@/components/ui-elements';
import { useVerifyPassword } from '@/hooks/use-auth';

export default function Login() {
  const [password, setPassword] = useState('');
  const [, setLocation] = useLocation();
  const verifyMutation = useVerifyPassword();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyMutation.mutate(password, {
      onSuccess: () => setLocation('/agents'),
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#050505]">
      {/* Background Stock Image */}
      {/* abstract elegant dark background with subtle glows */}
      <img 
        src="https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2000&auto=format&fit=crop" 
        alt="Dark abstract background"
        className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none mix-blend-screen"
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md p-8"
      >
        <div className="glass-panel p-10 rounded-3xl relative overflow-hidden">
          {/* Inner ambient glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 blur-[60px] rounded-full pointer-events-none" />
          
          <div className="flex justify-center mb-8 relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-2xl shadow-primary/30">
              <Command className="w-8 h-8 text-white" />
            </div>
          </div>
          
          <div className="text-center mb-8 relative">
            <h1 className="text-3xl font-display font-bold text-white mb-2">AI Command Hub</h1>
            <p className="text-muted-foreground">Enter your security key to access the mainframe.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 relative">
            <div className="space-y-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Security Key (default: aihub2024)"
                  className="pl-11 py-3 text-lg bg-black/40 border-white/10 text-white placeholder:text-white/20 focus-visible:border-primary/50"
                  autoFocus
                />
              </div>
              {verifyMutation.isError && (
                <motion.p 
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  className="text-destructive text-sm font-medium pl-1"
                >
                  Invalid security key. Access denied.
                </motion.p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full py-6 text-lg" 
              isLoading={verifyMutation.isPending}
            >
              {!verifyMutation.isPending && (
                <>
                  Authenticate <ArrowRight className="ml-2 w-5 h-5" />
                </>
              )}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
