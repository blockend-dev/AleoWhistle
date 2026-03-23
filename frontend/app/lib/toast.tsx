"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, Loader2, X } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "warning" | "info" | "loading";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;       // ms; 0 = persistent (loading toasts)
}

interface ToastContextValue {
  success: (msg: string, opts?: { id?: string; duration?: number }) => string;
  error:   (msg: string, opts?: { id?: string; duration?: number }) => string;
  warning: (msg: string, opts?: { id?: string; duration?: number }) => string;
  info:    (msg: string, opts?: { id?: string; duration?: number }) => string;
  loading: (msg: string, opts?: { id?: string }) => string;
  dismiss: (id: string) => void;
  /** Update an existing toast (e.g. loading → success) */
  update:  (id: string, type: ToastType, msg: string, opts?: { duration?: number }) => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

// ─── Icons ───────────────────────────────────────────────────────────────────

const ICON: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle  className="h-4 w-4 text-neon-green flex-shrink-0" />,
  error:   <XCircle      className="h-4 w-4 text-neon-red   flex-shrink-0" />,
  warning: <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0" />,
  info:    <Info          className="h-4 w-4 text-neon-blue  flex-shrink-0" />,
  loading: <Loader2       className="h-4 w-4 text-neon-blue  flex-shrink-0 animate-spin" />,
};

const BORDER: Record<ToastType, string> = {
  success: "border-neon-green/40",
  error:   "border-neon-red/40",
  warning: "border-yellow-500/40",
  info:    "border-neon-blue/40",
  loading: "border-neon-blue/30",
};

const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 4000,
  error:   6000,
  warning: 6000,
  info:    4000,
  loading: 0,    // persistent until manually dismissed or updated
};

// ─── Provider ────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const addOrUpdate = useCallback(
    (id: string, type: ToastType, message: string, duration?: number) => {
      // Clear any existing timer for this id
      if (timers.current[id]) {
        clearTimeout(timers.current[id]);
        delete timers.current[id];
      }

      const ms = duration ?? DEFAULT_DURATION[type];

      setToasts((prev) => {
        const exists = prev.find((t) => t.id === id);
        if (exists) {
          return prev.map((t) => t.id === id ? { ...t, type, message, duration: ms } : t);
        }
        return [...prev, { id, type, message, duration: ms }];
      });

      if (ms > 0) {
        timers.current[id] = setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
          delete timers.current[id];
        }, ms);
      }

      return id;
    },
    [],
  );

  const makeId = () => Math.random().toString(36).slice(2, 9);

  const success = useCallback(
    (msg: string, opts?: { id?: string; duration?: number }) =>
      addOrUpdate(opts?.id ?? makeId(), "success", msg, opts?.duration),
    [addOrUpdate],
  );
  const error = useCallback(
    (msg: string, opts?: { id?: string; duration?: number }) =>
      addOrUpdate(opts?.id ?? makeId(), "error", msg, opts?.duration),
    [addOrUpdate],
  );
  const warning = useCallback(
    (msg: string, opts?: { id?: string; duration?: number }) =>
      addOrUpdate(opts?.id ?? makeId(), "warning", msg, opts?.duration),
    [addOrUpdate],
  );
  const info = useCallback(
    (msg: string, opts?: { id?: string; duration?: number }) =>
      addOrUpdate(opts?.id ?? makeId(), "info", msg, opts?.duration),
    [addOrUpdate],
  );
  const loading = useCallback(
    (msg: string, opts?: { id?: string }) =>
      addOrUpdate(opts?.id ?? makeId(), "loading", msg, 0),
    [addOrUpdate],
  );
  const dismiss = useCallback((id: string) => {
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);
  const update = useCallback(
    (id: string, type: ToastType, msg: string, opts?: { duration?: number }) =>
      addOrUpdate(id, type, msg, opts?.duration),
    [addOrUpdate],
  );

  return (
    <ToastContext.Provider value={{ success, error, warning, info, loading, dismiss, update }}>
      {children}

      {/* ── Toast container ─────────────────────────────────────────────── */}
      <div
        aria-live="polite"
        className="fixed top-20 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`
              pointer-events-auto flex items-start gap-3
              bg-cyber-darker border rounded-lg px-4 py-3 shadow-xl
              font-mono text-sm text-white
              animate-in slide-in-from-right-5 fade-in duration-200
              ${BORDER[t.type]}
            `}
          >
            {ICON[t.type]}
            <span className="flex-1 leading-snug break-words">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="flex-shrink-0 text-gray-500 hover:text-white transition-colors mt-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}


let _ctx: ToastContextValue | null = null;

/** Call this once inside a component that has access to ToastContext. */
export function _registerToastContext(ctx: ToastContextValue) {
  _ctx = ctx;
}

function requireCtx(): ToastContextValue {
  if (!_ctx) throw new Error("Toast context not registered. Render <ToastProvider> first.");
  return _ctx;
}

export const toast = {
  success: (msg: string, opts?: { id?: string; duration?: number }) =>
    requireCtx().success(msg, opts),
  error: (msg: string, opts?: { id?: string; duration?: number }) =>
    requireCtx().error(msg, opts),
  warning: (msg: string, opts?: { id?: string; duration?: number }) =>
    requireCtx().warning(msg, opts),
  info: (msg: string, opts?: { id?: string; duration?: number }) =>
    requireCtx().info(msg, opts),
  loading: (msg: string, opts?: { id?: string }) =>
    requireCtx().loading(msg, opts),
  dismiss: (id: string) => requireCtx().dismiss(id),
};
