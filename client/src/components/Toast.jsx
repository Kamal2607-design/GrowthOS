import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CircleCheck, Info, TriangleAlert, X } from 'lucide-react';

import { cn } from './ui.jsx';

const ToastContext = createContext(null);

const TONES = {
  success: { icon: CircleCheck, className: 'text-success' },
  info: { icon: Info, className: 'text-progress' },
  warning: { icon: TriangleAlert, className: 'text-warn' },
  danger: { icon: TriangleAlert, className: 'text-danger' },
};

/**
 * Lightweight notifications. Success/info toasts are announced politely;
 * warnings and errors assertively. Each disappears after a few seconds
 * and can be dismissed.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (message, { tone = 'success', duration = 4200 } = {}) => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-3), { id, message, tone }]);
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss],
  );

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:px-6">
        {toasts.map((toast) => {
          const tone = TONES[toast.tone] ?? TONES.info;
          const Icon = tone.icon;
          const urgent = toast.tone === 'warning' || toast.tone === 'danger';

          return (
            <div
              key={toast.id}
              role={urgent ? 'alert' : 'status'}
              className="pointer-events-auto flex w-full max-w-sm animate-toast-in items-start gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-ink shadow-[var(--shadow-lift)]"
            >
              <Icon aria-hidden="true" className={cn('mt-0.5 size-5 flex-none', tone.className)} />
              <p className="m-0 flex-1 leading-relaxed">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
                className="-m-1 grid size-8 flex-none place-items-center rounded-lg text-muted hover:bg-hover"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext) ?? { show: () => 0, dismiss: () => {} };
}
