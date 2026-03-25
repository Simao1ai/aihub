import React, { forwardRef } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Button
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 border border-primary/50',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border',
      outline: 'bg-transparent text-foreground border-2 border-border hover:border-primary/50 hover:bg-primary/5',
      ghost: 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent',
      destructive: 'bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 hover:border-destructive/40',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm font-medium',
      lg: 'px-6 py-3 text-base font-semibold',
      icon: 'p-2 flex items-center justify-center',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center rounded-xl transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:pointer-events-none',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

// Card
export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('bg-card border border-border rounded-2xl overflow-hidden', className)} {...props}>
      {children}
    </div>
  );
}

// Input
export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'flex w-full rounded-xl border border-border bg-black/20 px-4 py-2.5 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50 transition-all',
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

// Badge
export function Badge({ className, variant = 'default', children }: { className?: string, variant?: 'default' | 'success' | 'warning' | 'error' | 'outline', children: React.ReactNode }) {
  const variants = {
    default: 'bg-secondary text-secondary-foreground border-border',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    error: 'bg-red-500/10 text-red-400 border-red-500/20',
    outline: 'bg-transparent text-muted-foreground border-border',
  };
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors', variants[variant], className)}>
      {children}
    </span>
  );
}

// Modal/Dialog
export function Modal({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2"
          >
            <div className="glass-panel rounded-2xl overflow-hidden flex flex-col max-h-[85vh]">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5">
                <h2 className="text-lg font-display font-semibold text-white">{title}</h2>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto">
                {children}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Switch
export function Switch({ checked, onChange }: { checked: boolean, onChange: (c: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
        checked ? "bg-primary" : "bg-secondary"
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}
