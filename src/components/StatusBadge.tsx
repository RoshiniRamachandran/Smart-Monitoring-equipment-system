import React from 'react';

interface StatusBadgeProps {
  status: 'connected' | 'disconnected' | 'connecting' | 'error' | 'online' | 'offline' | 'pending';
  label?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, size = 'md' }) => {
  const config = {
    connected: { bg: 'bg-emerald-500/15', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500', border: 'border-emerald-500/30' },
    online: { bg: 'bg-emerald-500/15', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500', border: 'border-emerald-500/30' },
    connecting: { bg: 'bg-amber-500/15', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500 animate-pulse', border: 'border-amber-500/30' },
    pending: { bg: 'bg-amber-500/15', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500', border: 'border-amber-500/30' },
    disconnected: { bg: 'bg-slate-500/15', text: 'text-slate-600 dark:text-slate-400', dot: 'bg-slate-400', border: 'border-slate-500/30' },
    error: { bg: 'bg-rose-500/15', text: 'text-rose-700 dark:text-rose-400', dot: 'bg-rose-500', border: 'border-rose-500/30' },
    offline: { bg: 'bg-rose-500/15', text: 'text-rose-700 dark:text-rose-400', dot: 'bg-rose-500', border: 'border-rose-500/30' },
  }[status] || { bg: 'bg-slate-500/15', text: 'text-slate-600', dot: 'bg-slate-400', border: 'border-slate-500/30' };

  const displayText = label || status.toUpperCase();

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium border rounded-full ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
      } ${config.bg} ${config.text} ${config.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span className="capitalize">{displayText}</span>
    </span>
  );
};
