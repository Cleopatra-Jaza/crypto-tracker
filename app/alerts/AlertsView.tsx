"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/currency";

type Coin = { id: string; name: string; current_price: number };
type Alert = {
  id: string;
  coinId: string;
  coinName: string;
  targetPrice: number;
  direction: string;
  triggeredAt: string | null;
  createdAt: string;
};

export default function AlertsView() {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [coinId, setCoinId] = useState("");
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [targetPrice, setTargetPrice] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notif, setNotif] = useState<NotificationPermission | "unsupported">("default");

  async function load() {
    setLoading(true);
    try {
      const [cRes, aRes] = await Promise.all([
        fetch("/api/coins?currency=usd", { cache: "no-store" }),
        fetch("/api/alerts", { cache: "no-store" }),
      ]);
      if (aRes.status === 401) {
        setUnauthorized(true);
        return;
      }
      if (cRes.ok) {
        const cData = await cRes.json();
        if (Array.isArray(cData)) {
          setCoins(cData.map((c: { id: string; name: string; current_price: number }) => ({
            id: c.id, name: c.name, current_price: c.current_price,
          })));
          if (!coinId && cData.length > 0) setCoinId(cData[0].id);
        }
      }
      if (aRes.ok) {
        const aData = await aRes.json();
        setAlerts(Array.isArray(aData?.alerts) ? aData.alerts : []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setNotif(typeof Notification !== "undefined" ? Notification.permission : "unsupported");
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = coins.find((c) => c.id === coinId);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const tp = Number(targetPrice);
    if (!Number.isFinite(tp) || tp <= 0) {
      setError("Target price must be a finite number greater than 0");
      return;
    }
    const coin = coins.find((c) => c.id === coinId);
    if (!coin) { setError("Select a coin"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coinId: coin.id, coinName: coin.name, targetPrice: tp, direction }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Failed to create alert");
        return;
      }
      setTargetPrice("");
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(id: string) {
    await fetch(`/api/alerts/${encodeURIComponent(id)}`, { method: "DELETE" });
    await load();
  }

  async function requestNotif() {
    if (typeof Notification === "undefined") return;
    const p = await Notification.requestPermission();
    setNotif(p);
  }

  if (unauthorized) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <h1 className="mb-4 text-3xl font-bold">Price alerts</h1>
        <p className="text-gray-300">
          Please sign in to use price alerts.{" "}
          <Link href="/api/auth/signin" className="text-blue-500 underline">Sign in</Link>
        </p>
      </main>
    );
  }

  const active = alerts.filter((a) => a.triggeredAt == null);
  const triggered = alerts.filter((a) => a.triggeredAt != null);

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-4 text-3xl font-bold">Price alerts</h1>

      {notif === "default" && (
        <button
          onClick={requestNotif}
          className="mb-4 rounded-lg border border-gray-500 px-4 py-2 text-sm"
        >
          Enable browser notifications
        </button>
      )}
      {notif === "denied" && (
        <p className="mb-4 text-sm text-gray-400">
          Notifications are blocked in your browser settings.
        </p>
      )}

      <form onSubmit={onSubmit} className="mb-4 space-y-3 rounded-lg border border-gray-700 bg-gray-800 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm text-gray-400">Coin</label>
            <select
              value={coinId}
              onChange={(e) => setCoinId(e.target.value)}
              className="w-full rounded-lg border border-gray-500 bg-transparent px-3 py-2"
            >
              {coins.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {selected && (
              <p className="mt-1 text-xs text-gray-400">
                Current: {formatMoney(selected.current_price, "usd")}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-400">Direction</label>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as "above" | "below")}
              className="w-full rounded-lg border border-gray-500 bg-transparent px-3 py-2"
            >
              <option value="above">Goes above</option>
              <option value="below">Drops below</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-400">Target price (USD)</label>
            <input
              type="number"
              step="any"
              min="0"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              className="w-full rounded-lg border border-gray-500 bg-transparent px-3 py-2"
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg border border-green-500 bg-green-500 px-4 py-2 text-black disabled:opacity-50"
        >
          Add alert
        </button>
      </form>

      <p className="mb-6 text-sm text-gray-400">
        Alerts are checked every minute while this site is open in a browser tab. All prices are in USD.
      </p>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-gray-700" />
          ))}
        </div>
      ) : (
        <>
          <h2 className="mb-2 text-xl font-semibold">Active alerts</h2>
          {active.length === 0 ? (
            <p className="mb-6 text-sm text-gray-400">No active alerts.</p>
          ) : (
            <ul className="mb-6 space-y-2">
              {active.map((a) => (
                <li key={a.id} className="flex items-center justify-between rounded border border-gray-700 bg-gray-800 p-3">
                  <span>
                    {a.coinName} {a.direction} {formatMoney(a.targetPrice, "usd")}
                  </span>
                  <button
                    onClick={() => onDelete(a.id)}
                    className="rounded border border-gray-500 px-2 py-1 text-sm"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}

          <h2 className="mb-2 text-xl font-semibold">Triggered alerts</h2>
          {triggered.length === 0 ? (
            <p className="text-sm text-gray-400">No triggered alerts.</p>
          ) : (
            <ul className="space-y-2">
              {triggered.map((a) => (
                <li key={a.id} className="flex items-center justify-between rounded border border-gray-700 bg-gray-800 p-3">
                  <span>
                    {a.coinName} {a.direction} {formatMoney(a.targetPrice, "usd")}
                    {a.triggeredAt && (
                      <span className="ml-2 text-xs text-gray-400">
                        {new Date(a.triggeredAt).toLocaleString()}
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => onDelete(a.id)}
                    className="rounded border border-gray-500 px-2 py-1 text-sm"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
