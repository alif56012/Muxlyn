import { useCallback, useEffect, useRef, useState } from 'react';

interface ToastItem {
  id: number;
  message: string;
  variant: 'success' | 'warning' | 'error';
}

const VARIANT_STYLES: Record<string, string> = {
  success:
    'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  warning:
    'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200',
  error: 'border-destructive/50 bg-destructive/5 text-destructive',
};

export function ToastProvider() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextIdRef = useRef(0);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(
    () => () => {
      for (const timer of timersRef.current.values()) clearTimeout(timer);
    },
    [],
  );

  const addToast = useCallback((message: string, variant: 'success' | 'warning' | 'error') => {
    const id = nextIdRef.current++;
    setToasts((prev) => [...prev, { id, message, variant }]);
    const timer = setTimeout(() => {
      timersRef.current.delete(id);
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
    timersRef.current.set(id, timer);
  }, []);

  useEffect(() => {
    const handle = (e: Event) => {
      if (!(e instanceof CustomEvent)) return;
      const { message, variant } = e.detail ?? {};
      addToast(message, variant || 'warning');
    };
    window.addEventListener('toast:show', handle);
    return () => window.removeEventListener('toast:show', handle);
  }, [addToast]);

  const dismiss = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={`flex items-center justify-between gap-3 rounded-md border px-4 py-3 shadow-lg ${VARIANT_STYLES[toast.variant] ?? VARIANT_STYLES.warning}`}
        >
          <p className="text-sm">{toast.message}</p>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            className="text-current opacity-50 hover:opacity-100"
            aria-label="Close"
          >
            &#x2715;
          </button>
        </div>
      ))}
    </div>
  );
}
