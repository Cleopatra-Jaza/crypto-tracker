"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  createChart,
  AreaSeries,
  ColorType,
  UTCTimestamp,
} from "lightweight-charts";

const RANGES = [
  { label: "1D", days: 1 },
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "1Y", days: 365 },
];

export default function CoinDetail({ id }: { id: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [days, setDays] = useState(7);
  const [prices, setPrices] = useState<[number, number][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Data load
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/coins/${id}?days=${days}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load");
        setPrices(data.prices);
        setError("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, days]);

  // Chart draw
  useEffect(() => {
    if (!containerRef.current || prices.length === 0) return;

    const chart = createChart(containerRef.current, {
      height: 400,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9ca3af",
      },
      grid: {
        vertLines: { color: "#374151" },
        horzLines: { color: "#374151" },
      },
      timeScale: { timeVisible: days <= 7 },
    });

    const series = chart.addSeries(AreaSeries, {
      lineColor: "#22c55e",
      topColor: "rgba(34,197,94,0.4)",
      bottomColor: "rgba(34,197,94,0)",
    });

    // time seconds-la venum, duplicate time irukka koodadhu
    const seen = new Set<number>();
    const data = prices
      .map(([ms, price]) => ({
        time: Math.floor(ms / 1000) as UTCTimestamp,
        value: price,
      }))
      .filter((p) => {
        if (seen.has(p.time)) return false;
        seen.add(p.time);
        return true;
      });

    series.setData(data);
    chart.timeScale().fitContent();

    return () => chart.remove();
  }, [prices, days]);

  const latest = prices.length ? prices[prices.length - 1][1] : null;

  return (
    <main className="mx-auto max-w-4xl p-6">
      <Link href="/" className="text-sm text-gray-400 hover:underline">
        ← Back
      </Link>

      <h1 className="mt-2 text-3xl font-bold capitalize">{id}</h1>
      {latest !== null && (
        <p className="mb-4 text-2xl">
  ${latest.toLocaleString(undefined, { maximumFractionDigits: 2 })}
</p>
      )}

      <div className="mb-4 flex gap-2">
        {RANGES.map((r) => (
          <button
            key={r.label}
            onClick={() => setDays(r.days)}
            className={`rounded-lg border px-4 py-2 ${
              days === r.days
                ? "border-green-500 bg-green-500 text-black"
                : "border-gray-500"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="h-[400px] w-full animate-pulse rounded bg-gray-700" />
      )}
      {error && <p className="text-red-500">Error: {error}</p>}
      {!loading && <div ref={containerRef} className="w-full" />}
    </main>
  );
}