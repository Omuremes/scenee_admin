import { createContext, ReactNode, useContext, useMemo, useState } from "react";

type ToastTone = "success" | "error";

interface ToastRecord {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastContextValue {
  pushToast: (tone: ToastTone, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const value = useMemo<ToastContextValue>(
    () => ({
      pushToast: (tone, message) => {
        const id = Date.now() + Math.random();
        setToasts((current) => [...current, { id, tone, message }]);
        window.setTimeout(() => {
          setToasts((current) => current.filter((toast) => toast.id !== id));
        }, 3500);
      },
    }),
    [],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.tone}`}>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
}
