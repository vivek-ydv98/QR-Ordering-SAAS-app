'use client';

import React from 'react';
import { useToastStore, Toast } from '../store/useToastStore';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const getColors = () => {
    switch (toast.type) {
      case 'success':
        return {
          bg: 'bg-emerald-500/10 dark:bg-emerald-950/20',
          border: 'border-emerald-500/20 dark:border-emerald-500/10',
          text: 'text-emerald-800 dark:text-emerald-400',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
        };
      case 'error':
        return {
          bg: 'bg-rose-500/10 dark:bg-rose-950/20',
          border: 'border-rose-500/20 dark:border-rose-500/10',
          text: 'text-rose-800 dark:text-rose-400',
          icon: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />,
        };
      case 'warning':
        return {
          bg: 'bg-amber-500/10 dark:bg-amber-950/20',
          border: 'border-amber-500/20 dark:border-amber-500/10',
          text: 'text-amber-800 dark:text-amber-400',
          icon: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
        };
      case 'info':
      default:
        return {
          bg: 'bg-indigo-500/10 dark:bg-indigo-950/20',
          border: 'border-indigo-500/20 dark:border-indigo-500/10',
          text: 'text-indigo-800 dark:text-indigo-400',
          icon: <Info className="w-5 h-5 text-indigo-500 shrink-0" />,
        };
    }
  };

  const config = getColors();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: -10, transition: { duration: 0.2 } }}
      className={`pointer-events-auto flex items-center justify-between p-4 rounded-2xl border backdrop-blur-md shadow-lg transition-all ${config.bg} ${config.border}`}
    >
      <div className="flex items-center gap-3 flex-1">
        {config.icon}
        <span className={`text-xs font-bold leading-relaxed ${config.text}`}>
          {toast.message}
        </span>
      </div>
      <button
        onClick={onClose}
        className="ml-4 p-1 rounded-lg hover:bg-slate-500/10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors shrink-0"
        aria-label="Dismiss toast"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
