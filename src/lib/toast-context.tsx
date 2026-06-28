"use client";

import {
  createContext, useContext, useState, useCallback,
  useEffect, ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { ToastPayload } from "@/lib/notification-types";

interface Toast extends ToastPayload { id: string; }

interface ToastContextValue { showToast: (t: ToastPayload) => void; }

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() { return useContext(ToastContext); }

const ACCENT: Record<string, string> = {
  success: "#4ADE80",
  error:   "#F87171",
  info:    "#F5B61E",
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  return (
    <div style={{
      display: "flex", gap: "0.65rem", alignItems: "flex-start",
      background: "#1A1914",
      border: "1px solid rgba(245,182,30,0.15)",
      borderRadius: "0.6rem",
      padding: "0.75rem 0.9rem",
      boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
      maxWidth: "340px", width: "100%",
      animation: "fadeInDown 0.18s ease",
    }}>
      <div style={{
        width: "3px", borderRadius: "2px",
        background: ACCENT[toast.type] ?? "#F5B61E",
        alignSelf: "stretch", flexShrink: 0,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "#F0EDE6", margin: 0 }}>
          {toast.title}
        </p>
        {toast.body && (
          <p style={{ fontSize: "0.74rem", color: "rgba(240,237,230,0.55)", margin: "0.2rem 0 0" }}>
            {toast.body}
          </p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: "rgba(240,237,230,0.3)", padding: "0.1rem",
          flexShrink: 0, lineHeight: 1, fontSize: "0.9rem",
        }}
      >✕</button>
    </div>
  );
}

function Toaster({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || toasts.length === 0) return null;

  return createPortal(
    <div style={{
      position: "fixed", top: "1rem", right: "1rem", zIndex: 9999,
      display: "flex", flexDirection: "column", gap: "0.5rem",
      alignItems: "flex-end",
    }}>
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body,
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((payload: ToastPayload) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...payload, id }].slice(-3));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}
