"use client";
import { useEffect } from "react";
import { useToast, _registerToastContext } from "@/app/lib/toast";

/**
 * Registers the ToastContext with the `toast` singleton so that
 * non-component code (like dashboard handlers) can call toast.success()
 * without needing direct access to the context.
 *
 * Must be rendered inside <ToastProvider>.
 */
export function ToastBridge() {
  const ctx = useToast();
  useEffect(() => {
    _registerToastContext(ctx);
  }, [ctx]);
  return null;
}
