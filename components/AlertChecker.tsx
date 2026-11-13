"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/currency";

type Toast = { id: string; text: string };
type Triggered = { coinName: string; direction: string; targetPrice: number };

function toastText(t: Triggered) {
  const dir = t.direction === "below" ? "dropped below" : "went above";
  return `${t.coinName} ${dir} ${formatMoney(t.targetPrice, "usd")}`;
}

export default function AlertChecker() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const checking = useRef(false);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const pushToast = useCallback((text: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, text }].slice(-5));
    timers.current[id] = setTimeout(() => dismiss(id), 20000);
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      try {
        new Notification("Price alert", { body: text });
      } catch {}
    }
  }, [dismiss]);

  const check = useCallback(async () => {
    if (checking.current) return;
    checking.current = true;
    try {
      const res = await fetch("/api/alerts/check", { method: "POST", cache: "no-store" });
      if (res.status === 401) return; // skip this round, retry next time
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        console.error("alert check failed", res.status, data);
        return;
      }
      if (Array.isArray(data?.triggered)) {
        for (const t of data.triggered as Triggered[]) pushToast(toastText(t));
      }
    } catch (e) {
      console.error("alert check error", e);
    } finally {
      checking.current = false;
    }
  }, [pushToast]);

  useEffect(() => {
    let cancelled = false;
    const safeCheck = () => { if (!cancelled) check(); };

    const start = setTimeout(() => {
      safeCheck();
    }, 5000);
    const interval = setInterval(safeCheck, 60000);

    const onVisible = () => {
      if (document.visibilityState === "visible") safeCheck();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", safeCheck);

    const onTriggered = (e: Event) => {
      const detail = (e as CustomEvent<Triggered[]>).detail;
      if (Array.isArray(detail)) {
        for (const t of detail) pushToast(toastText(t));
      }
    };
    window.addEventListener("alert-triggered", onTriggered as EventListener);

    return () => {
      cancelled = true;
      clearTimeout(start);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", safeCheck);
      window.removeEventListener("alert-triggered", onTriggered as EventListener);
      Object.values(timers.current).forEach(clearTimeout);
      timers.current = {};
    };
  }, [check, pushToast]);

  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex w-auto max-w-[calc(100vw-2rem)] flex-col gap-2 md:left-auto md:right-4 md:w-80">
      {toasts.map((t) => (
        <div key={t.id} className="flex items-start justify-between gap-2 rounded-lg border border-gray-600 bg-gray-800 p-3 shadow-lg">
          <span className="text-sm text-gray-100 break-words">{t.text}</span>
          <button
            onClick={() => dismiss(t.id)}
            className="shrink-0 text-gray-400 hover:text-gray-200"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

