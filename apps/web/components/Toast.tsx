"use client";
import { useEffect, useState, useCallback, createContext, useContext, type ReactNode } from "react";

type ToastType = "success" | "error" | "info" | "warn";

type Toast = {
  id: string;
  type: ToastType;
  message: string;
};

const ToastContext = createContext<{
  addToast: (type: ToastType, message: string) => void;
}>({ addToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  function removeToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none" style={{ minWidth: 280, maxWidth: 400 }}>
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDone={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const BG: Record<ToastType, string> = {
  success: "rgba(34,197,94,0.12)",
  error: "rgba(239,68,68,0.12)",
  info: "rgba(59,130,246,0.12)",
  warn: "rgba(245,158,11,0.12)",
};

const BORDER: Record<ToastType, string> = {
  success: "rgba(34,197,94,0.5)",
  error: "rgba(239,68,68,0.5)",
  info: "rgba(59,130,246,0.5)",
  warn: "rgba(245,158,11,0.5)",
};

function ToastItem({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(onDone, 300);
    }, 3500);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      className={`pointer-events-auto rounded-lg p-3.5 shadow-xl ${exiting ? "animate-slide-out" : "animate-slide-in"}`}
      style={{
        backgroundColor: BG[toast.type],
        border: `1px solid ${BORDER[toast.type]}`,
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="flex justify-between items-start gap-2">
        <span className="text-xs font-semibold tracking-wide" style={{ color: "var(--text-primary)" }}>
          {toast.message}
        </span>
        <button
          onClick={() => { setExiting(true); setTimeout(onDone, 300); }}
          className="bg-transparent border-none cursor-pointer p-0 text-xs"
          style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
