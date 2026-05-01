import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { ToastContext } from './toastContext';
import type { ToastContextValue, ToastVariant } from './toastContext';
import styles from './Toast.module.css';

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const push = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = ++nextId;
    setItems((prev) => [...prev, { id, message, variant }]);
    const timer = setTimeout(() => dismiss(id), 4500);
    timersRef.current.set(id, timer);
  }, [dismiss]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const value: ToastContextValue = useMemo(() => ({
    push,
    success: (m) => push(m, 'success'),
    error: (m) => push(m, 'error'),
    info: (m) => push(m, 'info'),
  }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.container} role="status" aria-live="polite">
        {items.map((item) => (
          <div key={item.id} className={`${styles.toast} ${styles[item.variant]}`}>
            <span className={styles.icon}>
              {item.variant === 'success' && <CheckCircle2 size={18} />}
              {item.variant === 'error' && <AlertCircle size={18} />}
              {item.variant === 'info' && <Info size={18} />}
            </span>
            <span className={styles.message}>{item.message}</span>
            <button
              className={styles.close}
              onClick={() => dismiss(item.id)}
              aria-label="Close notification"
              type="button"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
