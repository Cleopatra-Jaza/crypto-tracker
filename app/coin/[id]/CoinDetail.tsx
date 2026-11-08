"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useCurrency } from "@/lib/useCurrency";
import { formatMoney, formatCompactMoney } from "@/lib/currency";
import { sma, ema, rsi, macd, type Point } from "@/lib/indicators";
import {
  createChart,
  AreaSeries,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  ColorType,
  UTCTimestamp,
  LineStyle,
} from "lightweight-charts";

const RANGES = [
  { label: "1D", days: 1 },
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
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

type ChartData =
  | { type: "line"; prices: [number, number][]; key: string }
  | { type: "candles"; candles: [number, number, number, number, number][]; key: string };

export default function CoinDetail({ id }: { id: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currency] = useCurrency();
  const [days, setDays] = useState(7);
  const [chartType, setChartType] = useState<"line" | "candles">("line");
  const [showSMA20, setShowSMA20] = useState(false);
  const [showSMA50, setShowSMA50] = useState(false);
  const [showRSI, setShowRSI] = useState(false);
  const [showMACD, setShowMACD] = useState(false);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState("");
  const [retry, setRetry] = useState(0);
  const [indicatorHint, setIndicatorHint] = useState("");
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
  const [detailsError, setDetailsError] = useState(false);
  const [chartDoneKey, setChartDoneKey] = useState("");
  const [expanded, setExpanded] = useState(false);
  const lastDetailsFetch = useRef("");

  const chartKey = `${id}|${days}|${currency}|${chartType}`;
  const detailsKey = `${id}|${currency}`;

  // Chart data load
  useEffect(() => {
    setChartData(null);
    setChartLoading(true);
    setChartError("");
    let ignore = false;
    const controller = new AbortController();

    async function load() {
      try {
        const url =
          chartType === "line"
            ? `/api/coins/${id}?days=${days}&currency=${currency}`
            : `/api/coins/${encodeURIComponent(id)}/ohlc?days=${days}&currency=${currency}`;
        const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load");
        if (ignore) return;
        if (chartType === "line") {
          setChartData({ type: "line", prices: data.prices ?? [], key: chartKey });
        } else {
          setChartData({ type: "candles", candles: data.candles ?? [], key: chartKey });
        }
        setChartError("");
      } catch (e) {
        if (ignore || (e instanceof DOMException && e.name === "AbortError")) return;
        setChartError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        if (!ignore) {
          setChartLoading(false);
          setChartDoneKey(chartKey);
        }
      }
    }
    load();
    return () => {
      ignore = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, days, currency, chartType, retry]);

  // Details load - only after chart finishes
  useEffect(() => {
    if (!chartDoneKey) return;
    if (lastDetailsFetch.current === detailsKey) return;
    let ignore = false;
    lastDetailsFetch.current = detailsKey;
    setDetails(null);
    setDetailsError(false);
    async function loadDetails() {
      try {
        const res = await fetch(
          `/api/coins/${encodeURIComponent(id)}/details?currency=${currency}`,
          { cache: "no-store" }
        );
        if (!res.ok) {
          if (!ignore) setDetailsError(true);
          return;
        }
        const data = await res.json();
        if (!ignore) {
          setDetails(data);
          setDetailsError(false);
        }
      } catch {
        if (!ignore) setDetailsError(true);
      }
    }
    loadDetails();
    return () => {
      ignore = true;
    };
  }, [chartDoneKey, id, currency, detailsKey]);

  // Chart draw
  useEffect(() => {
    if (!containerRef.current) return;
    if (!chartData || chartData.key !== chartKey) return;
    if (chartData.type === "line" && chartData.prices.length === 0) return;
    if (chartData.type === "candles" && chartData.candles.length === 0) return;

    let hints: string[] = [];
    const hasIndicators = showSMA20 || showSMA50 || showRSI || showMACD;
    const chartHeight = hasIndicators && (showRSI || showMACD) ? 520 : 400;

    const chart = createChart(containerRef.current, {
      height: chartHeight,
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

    // Close prices for indicators
    let closes: Point[] = [];
    if (chartData.type === "line") {
      const seen = new Set<number>();
      closes = chartData.prices
        .map(([ms, value]) => ({
          time: Math.floor(ms / 1000),
          value,
        }))
        .filter((p) => {
          if (seen.has(p.time)) return false;
          seen.add(p.time);
          return true;
        });
      closes.sort((a, b) => a.time - b.time);
    } else {
      const seen = new Set<number>();
      closes = chartData.candles
        .map(([ms, , , , close]) => ({
          time: Math.floor(ms / 1000),
          value: close,
        }))
        .sort((a, b) => a.time - b.time)
        .filter((p) => {
          if (seen.has(p.time)) return false;
          seen.add(p.time);
          return true;
        });
    }

    // Main series
    if (chartData.type === "line") {
      const series = chart.addSeries(AreaSeries, {
        lineColor: "#22c55e",
        topColor: "rgba(34,197,94,0.4)",
        bottomColor: "rgba(34,197,94,0)",
      });
      series.setData(
        closes.map((p) => ({ time: p.time as UTCTimestamp, value: p.value }))
      );
    } else {
      const series = chart.addSeries(CandlestickSeries, {
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderVisible: false,
        wickUpColor: "#22c55e",
        wickDownColor: "#ef4444",
      });
      const seen = new Set<number>();
      const data = chartData.candles
        .map(([ms, open, high, low, close]) => ({
          time: Math.floor(ms / 1000) as UTCTimestamp,
          open,
          high,
          low,
          close,
        }))
        .sort((a, b) => (a.time as number) - (b.time as number))
        .filter((p) => {
          if (seen.has(p.time as number)) return false;
          seen.add(p.time as number);
          return true;
        });
      series.setData(data);
    }

    // SMA overlays on main pane
    if (showSMA20) {
      const data = sma(closes, 20);
      if (data.length === 0) hints.push("SMA 20");
      else {
        const s = chart.addSeries(LineSeries, {
          color: "#f59e0b",
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
        s.setData(data.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
      }
    }
    if (showSMA50) {
      const data = sma(closes, 50);
      if (data.length === 0) hints.push("SMA 50");
      else {
        const s = chart.addSeries(LineSeries, {
          color: "#3b82f6",
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
        s.setData(data.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
      }
    }

    let nextPane = 1;
    if (showRSI) {
      const data = rsi(closes, 14);
      if (data.length === 0) {
        hints.push("RSI");
      } else {
        const s = chart.addSeries(
          LineSeries,
          {
            color: "#a855f7",
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: true,
            autoscaleInfoProvider: () => ({
              priceRange: { minValue: 0, maxValue: 100 },
            }),
          },
          nextPane
        );
        s.setData(data.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
        s.createPriceLine({
          price: 30,
          color: "#ef4444",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "",
        });
        s.createPriceLine({
          price: 70,
          color: "#22c55e",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "",
        });
        nextPane++;
      }
    }

    if (showMACD) {
      const result = macd(closes, 12, 26, 9);
      if (result.macd.length === 0 || result.histogram.length === 0) {
        hints.push("MACD");
      } else {
        const hist = chart.addSeries(
          HistogramSeries,
          {
            priceLineVisible: false,
            lastValueVisible: false,
          },
          nextPane
        );
        hist.setData(
          result.histogram.map((p) => ({
            time: p.time as UTCTimestamp,
            value: p.value,
            color: p.value >= 0 ? "#22c55e" : "#ef4444",
          }))
        );
        const macdLine = chart.addSeries(
          LineSeries,
          {
            color: "#3b82f6",
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: true,
          },
          nextPane
        );
        macdLine.setData(result.macd.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
        const signalLine = chart.addSeries(
          LineSeries,
          {
            color: "#f59e0b",
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: true,
          },
          nextPane
        );
        signalLine.setData(result.signal.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
        nextPane++;
      }
    }

    // Pane heights
    if (nextPane > 1) {
      const mainPane = chart.panes()[0];
      if (mainPane) mainPane.setHeight(300);
      for (let i = 1; i < nextPane; i++) {
        const p = chart.panes()[i];
        if (p) p.setHeight(100);
      }
    }

    setIndicatorHint(hints.length > 0 ? `Not enough data for this range: ${hints.join(", ")}` : "");
    chart.timeScale().fitContent();
    return () => chart.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartData, days, currency, chartType, chartKey, showSMA20, showSMA50, showRSI, showMACD]);

  const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 });

  function statValue(key: string): string {
    const d = details!;
    const v = d[key as keyof typeof d];
    switch (key) {
      case "change24h":
      case "change7d":
      case "change30d":
      case "change1y": {
        const n = typeof v === "number" && Number.isFinite(v) ? v : null;
        return n == null ? "-" : `${n.toFixed(2)}%`;
      }
      case "athDate":
      case "atlDate": {
        const s = typeof v === "string" ? v : null;
        if (s == null) return "-";
        const date = new Date(s);
        return isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
      }
      case "circulatingSupply":
      case "totalSupply":
      case "maxSupply": {
        const n = typeof v === "number" && Number.isFinite(v) ? v : null;
        return n == null ? "-" : compact.format(n);
      }
      default: {
        const n = typeof v === "number" && Number.isFinite(v) ? v : null;
        return formatCompactMoney(n, currency);
      }
    }
  }

  function statColor(key: string): string {
    if (
      key === "change24h" ||
      key === "change7d" ||
      key === "change30d" ||
      key === "change1y"
    ) {
      const v = details?.[key as keyof typeof details];
      const n = typeof v === "number" && Number.isFinite(v) ? v : null;
      if (n == null) return "text-gray-400";
      return n >= 0 ? "text-green-500" : "text-red-500";
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
              {details?.name ?? (chartLoading ? <span className="animate-pulse" /> : id)}
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

      <div className="mb-4 flex gap-2 flex-wrap">
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
        <div className="ml-2 flex gap-1">
          <button
            onClick={() => setChartType("line")}
            className={`rounded-lg border px-4 py-2 ${
              chartType === "line"
                ? "border-green-500 bg-green-500 text-black"
                : "border-gray-500"
            }`}
          >
            Line
          </button>
          <button
            onClick={() => setChartType("candles")}
            className={`rounded-lg border px-4 py-2 ${
              chartType === "candles"
                ? "border-green-500 bg-green-500 text-black"
                : "border-gray-500"
            }`}
          >
            Candles
          </button>
        </div>
      </div>

      <div className="mb-4 flex gap-2 flex-wrap">
        <button
          onClick={() => setShowSMA20((v) => !v)}
          className={`rounded-lg border px-3 py-1 text-sm ${
            showSMA20 ? "border-yellow-500 bg-yellow-500 text-black" : "border-gray-500"
          }`}
        >
          SMA 20
        </button>
        <button
          onClick={() => setShowSMA50((v) => !v)}
          className={`rounded-lg border px-3 py-1 text-sm ${
            showSMA50 ? "border-blue-500 bg-blue-500 text-black" : "border-gray-500"
          }`}
        >
          SMA 50
        </button>
        <button
          onClick={() => setShowRSI((v) => !v)}
          className={`rounded-lg border px-3 py-1 text-sm ${
            showRSI ? "border-purple-500 bg-purple-500 text-black" : "border-gray-500"
          }`}
        >
          RSI
        </button>
        <button
          onClick={() => setShowMACD((v) => !v)}
          className={`rounded-lg border px-3 py-1 text-sm ${
            showMACD ? "border-cyan-500 bg-cyan-500 text-black" : "border-gray-500"
          }`}
        >
          MACD
        </button>
      </div>

      {indicatorHint && <p className="mb-2 text-sm text-gray-400">{indicatorHint}</p>}

      {chartLoading ? (
        <div className="h-[400px] w-full animate-pulse rounded bg-gray-700" />
      ) : chartError ? (
        <div className="h-[400px] w-full rounded bg-gray-800 flex flex-col items-center justify-center gap-4">
          <p className="text-red-500">{chartError}</p>
          <button
            onClick={() => setRetry((r) => r + 1)}
            className="rounded-lg border border-gray-500 px-4 py-2"
          >
            Try again
          </button>
        </div>
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
    </main>
  );
}
