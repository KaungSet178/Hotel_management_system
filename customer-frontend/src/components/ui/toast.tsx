import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react';
import { cn } from '@/lib/cn';

type ToastTone = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
}

interface ToastContextValue {
  notify: (toast: Omit<Toast, 'id'>) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const icons: Record<ToastTone, ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />,
  error: <CircleAlert className="h-5 w-5 text-rose-600" aria-hidden="true" />,
  info: <Info className="h-5 w-5 text-brand-600" aria-hidden="true" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const remove = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      counter.current += 1;
      const id = `toast-${counter.current}`;
      setToasts((current) => [...current, { ...toast, id }]);
      window.setTimeout(() => remove(id), 5200);
    },
    [remove],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      notify,
      success: (title, description) => notify({ tone: 'success', title, description }),
      error: (title, description) => notify({ tone: 'error', title, description }),
      info: (title, description) => notify({ tone: 'info', title, description }),
    }),
    [notify],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6"
        role="region"
        aria-label="Notifications"
      >
        <div aria-live="polite" aria-atomic="false" className="flex w-full flex-col items-center gap-2 sm:items-end">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={cn(
                'pointer-events-auto flex w-full max-w-sm animate-toast-in items-start gap-3 rounded-2xl border bg-white p-4 shadow-pop',
                toast.tone === 'success' && 'border-emerald-200',
                toast.tone === 'error' && 'border-rose-200',
                toast.tone === 'info' && 'border-brand-200',
              )}
            >
              {icons[toast.tone]}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{toast.title}</p>
                {toast.description ? (
                  <p className="mt-0.5 text-sm text-ink-soft">{toast.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => remove(toast.id)}
                aria-label="Dismiss notification"
                className="rounded-full p-1 text-ink-mute transition-colors hover:bg-lavender-100 hover:text-ink"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}