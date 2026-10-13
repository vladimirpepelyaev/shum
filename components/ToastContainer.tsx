import React, { useEffect, useState } from 'react';
import {
  Ban,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  Info,
  X,
  UserCheck,
  UserX,
  AlertTriangle,
} from 'lucide-react';
import { toastService, ToastItem, ToastType } from '../lib/toast';

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    return toastService.subscribe((list) => {
      setToasts(list);
    });
  }, []);

  if (toasts.length === 0) return null;

  const renderIcon = (type: ToastType) => {
    switch (type) {
      case 'block':
        return (
          <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0 text-rose-400">
            <Ban className="w-4 h-4" />
          </div>
        );
      case 'unblock':
        return (
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400">
            <UserCheck className="w-4 h-4" />
          </div>
        );
      case 'verified':
        return (
          <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center shrink-0 text-sky-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        );
      case 'unverified':
        return (
          <div className="w-8 h-8 rounded-xl bg-neutral-500/15 border border-neutral-500/30 flex items-center justify-center shrink-0 text-neutral-400">
            <UserX className="w-4 h-4" />
          </div>
        );
      case 'error':
        return (
          <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0 text-rose-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
        );
      case 'warn':
        return (
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
        );
      case 'success':
        return (
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
        );
      case 'info':
      default:
        return (
          <div className="w-8 h-8 rounded-xl bg-neutral-700/40 border border-neutral-600/50 flex items-center justify-center shrink-0 text-neutral-300">
            <Info className="w-4 h-4" />
          </div>
        );
    }
  };

  const getBorderClass = (type: ToastType) => {
    switch (type) {
      case 'block':
        return 'border-rose-900/60 shadow-rose-950/20';
      case 'unblock':
        return 'border-emerald-900/60 shadow-emerald-950/20';
      case 'verified':
        return 'border-sky-900/60 shadow-sky-950/20';
      case 'error':
        return 'border-rose-900/60 shadow-rose-950/20';
      default:
        return 'border-neutral-800 shadow-black/40';
    }
  };

  return (
    <div
      aria-live="polite"
      className="fixed top-4 right-3 sm:right-6 z-50 flex flex-col space-y-2.5 pointer-events-none max-w-[calc(100vw-1.5rem)] sm:max-w-sm w-full"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto bg-[#18181b]/95 backdrop-blur-md border ${getBorderClass(
            toast.type
          )} rounded-2xl p-3.5 shadow-2xl flex items-start space-x-3 transition-all duration-300 transform translate-y-0 opacity-100 hover:border-neutral-700`}
        >
          {renderIcon(toast.type)}

          <div className="flex-1 min-w-0 pr-1">
            <div className="text-xs sm:text-sm font-bold text-white tracking-tight flex items-center justify-between">
              <span className="truncate">{toast.title}</span>
            </div>
            <div className="text-xs text-neutral-300 mt-0.5 leading-snug break-words">
              {toast.message}
            </div>
          </div>

          <button
            type="button"
            onClick={() => toastService.dismiss(toast.id)}
            className="text-neutral-500 hover:text-white p-1 rounded-lg hover:bg-neutral-800/60 transition shrink-0"
            aria-label="Закрыть уведомление"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
