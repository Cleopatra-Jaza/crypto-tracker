"use client";

import { useEffect, useRef, useState } from "react";
import { useCurrency } from "@/lib/useCurrency";
import { formatMoney, formatCompactMoney } from "@/lib/currency";
import {
  createChart,
  LineSeries,
  ColorType,
  UTCTimestamp,
} from "lightweight-charts";

type Coin = { id: string; name: string };
type Details = {
  price: number | null;
  marketCap: number | null;
  volume: number | null;
  change24h: number | null;
  change7d: number | null;
  change30d: number | null;
  change1y: number | null;
  ath: number | null;
  circulatingSupply: number | null;
};

const RANGES = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
  { label: "1Y", days: 365 },
];

function toPercentSeries(prices: [number, number][]): { time: UTCTimestamp; value: number }[] {
  if (prices.length === 0) return [];
  const sorted = [...prices].sort((a, b) => a[0] - b[0]);
  const seen = new Set<number>();
  const deduped = sorted.filter(([ms]) => {
    const t = Math.floor(ms / 1000);
    if (seen.has(t)) return false;
    seen.add(t);
    return true;
  });
  if (deduped.length === 0) return [];
  const first = deduped[0][1];
  if (first === 0) return [];
  return deduped.map(([ms, price]) => ({
    time: Math.floor(ms / 1000) as UTCTimestamp,
    value: (price / first - 1) * 100,
  }));
}

function fmt(v: unknown, currency: string, type: "money" | "compactMoney" | "percent" | "supply"): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "-";
  switch (type) {
    case "money": return formatMoney(v, currency);
    case "compactMoney": return formatCompactMoney(v, currency);
    case "percent": return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
    case "supply": return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(v);
  }
}

export default function CompareView() {
  const [currency] = useCurrency();
  const [coins, setCoins] = useState<Coin[]>([]);
  const [coinA, setCoinA] = useState("bitcoin");
  const [coinB, setCoinB] = useState("ethereum");
  const [days, setDays] = useState(30);
  const [pricesA, setPricesA] = useState<[number, number][]>([]);
  const [pricesB, setPricesB] = useState<[number, number][]>([]);
  const [detailsA, setDetailsA] = useState<Details | null>(null);
  const [detailsB, setDetailsB] = useState<Details | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/coins")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCoins(data.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (coinA === coinB) return;
    setPricesA([]);
    setPricesB([]);
    setDetailsA(null);
    setDetailsB(null);
    setError("");
    setLoading(true);
    let ignore = false;
    const controller = new AbortController();

    async function load() {
      try {
        const r1 = await fetch(`/api/coins/${coinA}?days=${days}&currency=${currency}`, { signal: controller.signal });
        if (!r1.ok) throw new Error("Failed to load chart for Coin A");
        const d1 = await r1.json();
        if (ignore) return;
        setPricesA(d1.prices ?? []);

        const r2 = await fetch(`/api/coins/${coinB}?days=${days}&currency=${currency}`, { signal: controller.signal });
        if (!r2.ok) throw new Error("Failed to load chart for Coin B");
        const d2 = await r2.json();
        if (ignore) return;
        setPricesB(d2.prices ?? []);

        const r3 = await fetch(`/api/coins/${coinA}/details?currency=${currency}`, { signal: controller.signal });
        if (!r3.ok) throw new Error("Failed to load details for Coin A");
        const d3 = await r3.json();
        if (ignore) return;
        setDetailsA(d3);

        const r4 = await fetch(`/api/coins/${coinB}/details?currency=${currency}`, { signal: controller.signal });
        if (!r4.ok) throw new Error("Failed to load details for Coin B");
        const d4 = await r4.json();
        if (ignore) return;
        setDetailsB(d4);
      } catch (e) {
        if (ignore || (e instanceof DOMException && e.name === "AbortError")) return;
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [coinA, coinB, days, currency, retry]);

  useEffect(() => {
    if (!chartRef.current || pricesA.length === 0 || pricesB.length === 0) return;
    const chart = createChart(chartRef.current, {
      height: 400,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9ca3af",
      },
      grid: {
        vertLines: { color: "#374151" },
        horzLines: { color: "#374151" },
      },
      localization: {
        priceFormatter: (p: number) => `${p >= 0 ? "+" : ""}${p.toFixed(2)}%`,
      },
      timeScale: { timeVisible: days <= 7 },
    });
    const sA = chart.addSeries(LineSeries, { color: "#22c55e", lineWidth: 2 });
    const sB = chart.addSeries(LineSeries, { color: "#3b82f6", lineWidth: 2 });
    sA.setData(toPercentSeries(pricesA));
    sB.setData(toPercentSeries(pricesB));
    chart.timeScale().fitContent();
    return () => chart.remove();
  }, [pricesA, pricesB, days]);

  const sameCoin = coinA === coinB;
  const nameA = coins.find((c) => c.id === coinA)?.name ?? coinA;
  const nameB = coins.find((c) => c.id === coinB)?.name ?? coinB;

  const rows: { label: string; key: keyof Details; type: "money" | "compactMoney" | "percent" | "supply" }[] = [
    { label: "Price", key: "price", type: "money" },
    { label: "Market cap", key: "marketCap", type: "compactMoney" },
    { label: "24h volume", key: "volume", type: "compactMoney" },
    { label: "24h %", key: "change24h", type: "percent" },
    { label: "7d %", key: "change7d", type: "percent" },
    { label: "30d %", key: "change30d", type: "percent" },
    { label: "1y %", key: "change1y", type: "percent" },
    { label: "All-time high", key: "ath", type: "money" },
    { label: "Circulating supply", key: "circulatingSupply", type: "supply" },
  ];

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-4 text-3xl font-bold">Compare coins</h1>

      <div className="mb-4 flex flex-wrap gap-4">
        <select
          value={coinA}
          onChange={(e) => setCoinA(e.target.value)}
          className="rounded-lg border border-gray-500 bg-transparent px-3 py-2"
        >
          {coins.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={coinB}
          onChange={(e) => setCoinB(e.target.value)}
          className="rounded-lg border border-gray-500 bg-transparent px-3 py-2"
        >
          {coins.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {sameCoin && <p className="mb-4 text-sm text-gray-400">Pick two different coins</p>}

      <div className="mb-4 flex gap-2">
        {RANGES.map((r) => (
          <button
            key={r.label}
            onClick={() => setDays(r.days)}
            className={`rounded-lg border px-4 py-2 ${
              days === r.days ? "border-green-500 bg-green-500 text-black" : "border-gray-500"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-[400px] w-full animate-pulse rounded bg-gray-700" />
      ) : error ? (
        <div className="mb-4">
          <p className="mb-2 text-red-500">{error}</p>
          <button
            onClick={() => setRetry((r) => r + 1)}
            className="rounded-lg border border-gray-500 px-4 py-2"
          >
            Try again
          </button>
        </div>
      ) : !sameCoin && pricesA.length > 0 && pricesB.length > 0 ? (
        <>
          <div className="mb-2 flex gap-4 text-sm">
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
              {nameA}
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-full bg-blue-500" />
              {nameB}
            </span>
          </div>
          <div ref={chartRef} className="w-full" />
        </>
      ) : null}

      {!loading && !error && !sameCoin && (detailsA || detailsB) && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-500">
                <th className="p-3">Metric</th>
                <th className="p-3 text-right">{nameA}</th>
                <th className="p-3 text-right">{nameB}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const vA = detailsA?.[row.key] ?? null;
                const vB = detailsB?.[row.key] ?? null;
                const isPct = row.type === "percent";
                const color = (v: unknown) =>
                  isPct && typeof v === "number" && Number.isFinite(v)
                    ? v >= 0 ? "text-green-500" : "text-red-500"
                    : "";
                return (
                  <tr key={row.key} className="border-b border-gray-700">
                    <td className="p-3 text-gray-400">{row.label}</td>
                    <td className={`p-3 text-right ${color(vA)}`}>{fmt(vA, currency, row.type)}</td>
                    <td className={`p-3 text-right ${color(vB)}`}>{fmt(vB, currency, row.type)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}