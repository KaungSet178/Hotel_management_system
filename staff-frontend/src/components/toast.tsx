import { createContext, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

type ToastKind = 'success' | 'info' | 'warning';

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const KIND_STYLES: Record<ToastKind, { icon: typeof CheckCircle2; ring: string; iconColor: string }> = {
  success: { icon: CheckCircle2, ring: 'border-secondary/20', iconColor: 'text-secondary' },
  info: { icon: Info, ring: 'border-[#0e1c32]/15', iconColor: 'text-[#0e1c32]' },
  warning: { icon: AlertTriangle, ring: 'border-error/20', iconColor: 'text-error' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useMemo(
    () => (id: number) => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    },
    [],
  );

  const push = useMemo(
    () => (kind: ToastKind, message: string) => {
      const id = ++nextId.current;
      setToasts((prev) => [...prev.slice(-2), { id, kind, message }]);
      window.setTimeout(() => dismiss(id), 3200);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (message: string) => push('success', message),
      info: (message: string) => push('info', message),
      warning: (message: string) => push('warning', message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed right-6 bottom-6 z-[60] flex w-[min(360px,calc(100vw-3rem))] flex-col gap-2">
        {toasts.map((toast) => {
          const { icon: Icon, ring, iconColor } = KIND_STYLES[toast.kind];
          return (
            <button
              key={toast.id}
              type="button"
              onClick={() => dismiss(toast.id)}
              className={`pointer-events-auto flex animate-[toast-in_0.22s_ease-out] items-start gap-2.5 rounded-xl border ${ring} bg-surface-container-lowest px-4 py-3 text-left shadow-[0_12px_40px_-12px_rgba(17,28,45,0.35)]`}
            >
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`} />
              <span className="text-body-md text-on-surface">{toast.message}</span>
            </button>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const toast = useContext(ToastContext);
  if (!toast) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return toast;
}