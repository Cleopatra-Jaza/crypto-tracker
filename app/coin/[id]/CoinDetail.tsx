"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useCurrency } from "@/lib/useCurrency";
import { formatMoney, formatCompactMoney } from "@/lib/currency";
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

const STATS = [
  { key: "marketCap", label: "Market cap" },
  { key: "volume", label: "24h volume" },
  { key: "high24h", label: "24h high" },
  { key: "low24h", label: "24h low" },
  { key: "ath", label: "All-time high" },
  { key: "atl", label: "All-time low" },
  { key: "circulatingSupply", label: "Circulating supply" },
  { key: "totalSupply", label: "Total supply" },
  { key: "maxSupply", label: "Max supply" },
  { key: "change24h", label: "24h %" },
  { key: "change7d", label: "7d %" },
  { key: "change30d", label: "30d %" },
  { key: "change1y", label: "1y %" },
];

export default function CoinDetail({ id }: { id: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currency, setCurrency] = useCurrency();
  const [days, setDays] = useState(7);
  const [prices, setPrices] = useState<[number, number][]>([]);
  const [details, setDetails] = useState<{
    name: string | null;
    symbol: string | null;
    image: string | null;
    rank: number | null;
    description: string | null;
    homepage: string | null;
    price: number | null;
    marketCap: number | null;
    volume: number | null;
    high24h: number | null;
    low24h: number | null;
    ath: number | null;
    athDate: string | null;
    atl: number | null;
    atlDate: string | null;
    change24h: number | null;
    change7d: number | null;
    change30d: number | null;
    change1y: number | null;
    circulatingSupply: number | null;
    totalSupply: number | null;
    maxSupply: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailsError, setDetailsError] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);

  // Data load
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/coins/${id}?days=${days}&currency=${currency}`
        );
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
  }, [id, days, currency]);

  // Details load
  useEffect(() => {
    async function loadDetails() {
      setDetails(null);
      try {
        const res = await fetch(
          `/api/coins/${encodeURIComponent(id)}/details?currency=${currency}`,
          { cache: "no-store" }
        );
        if (!res.ok) {
          setDetailsError(true);
          return;
        }
        const data = await res.json();
        setDetails(data);
        setDetailsError(false);
      } catch {
        setDetailsError(true);
      }
    }
    loadDetails();
  }, [id, currency]);

  // Chart draw
  useEffect(() => {
    if (!containerRef.current || prices.length === 0) return;

    const chart = createChart(containerRef.current, {
      height: 400,
      localization: {
        priceFormatter: (p: number) => formatMoney(p, currency),
      },
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
  }, [prices, days, currency]);

  const latest = prices.length ? prices[prices.length - 1][1] : null;
  const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 });

  function statValue(key: string): string {
    const d = details!;
    const v = d[key as keyof typeof d];
    switch (key) {
      case "change24h":
      case "change7d":
      case "change30d":
      case "change1y":
        return v == null ? "-" : `${(v as number).toFixed(2)}%`;
      case "athDate":
      case "atlDate":
        return v == null ? "-" : new Date(v as string).toLocaleDateString();
      case "circulatingSupply":
      case "totalSupply":
      case "maxSupply":
        return v == null ? "-" : compact.format(v as number);
      default:
        return formatCompactMoney(v as number | null, currency);
    }
  }

  function statColor(key: string): string {
    if (
      key === "change24h" ||
      key === "change7d" ||
      key === "change30d" ||
      key === "change1y"
    ) {
      const v = details?.[key as keyof typeof details] as number | null;
      if (v == null) return "text-gray-400";
      return v >= 0 ? "text-green-500" : "text-red-500";
    }
    return "text-gray-300";
  }

  const plainText = (details?.description ?? "").replace(/<[^>]*>/g, "");
  const truncated = plainText.length > 600 ? plainText.slice(0, 600) + "..." : plainText;

  return (
    <main className="mx-auto max-w-4xl p-6">
      <Link href="/" className="text-sm text-gray-400 hover:underline">
        ← Back
      </Link>

      <div className="mb-4 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-3">
          {details?.image ? (
            <img src={details.image} alt={details.name ?? id} className="h-12 w-12 rounded" />
          ) : (
            <div className="h-12 w-12 rounded bg-gray-700 animate-pulse" />
          )}
          <div>
            <h1 className="text-3xl font-bold">
              {details?.name ?? (loading ? <span className="animate-pulse" /> : id)}
            </h1>
            <p className="text-sm uppercase text-gray-400">
              {details?.symbol?.toUpperCase() ?? ""}
              {details?.rank != null && (
                <span className="ml-2 text-xs text-gray-500">Rank #{details.rank}</span>
              )}
            </p>
          </div>
        </div>
      </div>

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

      {loading ? (
        <div className="h-[400px] w-full animate-pulse rounded bg-gray-700" />
      ) : (
        <div ref={containerRef} className="w-full" />
      )}

      {!detailsError && details ? (
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {STATS.map((s) => {
            const val = statValue(s.key);
            return (
              <div key={s.key} className="p-3 rounded bg-gray-800 border border-gray-700">
                <p className="text-xs text-gray-400">{s.label}</p>
                <p className={`text-sm font-medium ${statColor(s.key)}`}>{val}</p>
              </div>
            );
          })}
        </div>
      ) : null}

      {!detailsError && details ? (
        <div className="mt-6">
          <h2 className="mb-2 text-xl font-semibold">About</h2>
          <p className="mb-2 text-gray-300 max-w-2xl">
            {expanded ? plainText : truncated}
          </p>
          {plainText.length > 600 && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="text-sm text-blue-500 underline"
            >
              {expanded ? "Show less" : "Read more"}
            </button>
          )}
          {details.homepage && (
            <a
              href={details.homepage}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm text-blue-500 underline"
            >
              Website
            </a>
          )}
        </div>
      ) : null}

      {error && <p className="text-red-500">Error: {error}</p>}
    </main>
  );
}
