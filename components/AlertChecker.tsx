"use client";

import { useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/currency";

type Toast = { id: string; text: string };

export default function AlertChecker() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const checking = useRef(false);

  function pushToast(text: string) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, text }].slice(-5));
    timers.current[id] = setTimeout(() => dismiss(id), 20000);
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      try {
        new Notification("Price alert", { body: text });
      } catch {}
    }
  }

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    let stopped = false;

    async function check() {
      if (stopped || checking.current) return;
      checking.current = true;
      try {
        const res = await fetch("/api/alerts/check", { method: "POST", cache: "no-store" });
        if (res.status === 401) {
          stopped = true;
          if (interval) clearInterval(interval);
          return;
        }
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (Array.isArray(data?.triggered)) {
          for (const t of data.triggered) {
            const dir = t.direction === "below" ? "dropped below" : "went above";
            const text = `${t.coinName} ${dir} ${formatMoney(t.targetPrice, "usd")}`;
            pushToast(text);
          }
        }
      } catch {
        // ignore, try next time
      } finally {
        checking.current = false;
      }
    }

    const start = setTimeout(() => {
      check();
      if (!stopped) interval = setInterval(check, 60000);
    }, 5000);

    return () => {
      stopped = true;
      clearTimeout(start);
      if (interval) clearInterval(interval);
      Object.values(timers.current).forEach(clearTimeout);
      timers.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="flex items-start justify-between gap-2 rounded-lg border border-gray-600 bg-gray-800 p-3 shadow-lg">
          <span className="text-sm text-gray-100">{t.text}</span>
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
