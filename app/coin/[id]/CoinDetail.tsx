"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useCurrency } from "@/lib/useCurrency";
import useIsDark from "@/lib/useTheme";
import { formatMoney, formatCompactMoney } from "@/lib/currency";
import { sma, rsi, macd, type Point } from "@/lib/indicators";
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

type RangeKey = "1h" | "1d" | "7d" | "30d" | "90d" | "1y" | "all";

const RANGES: { label: string; key: RangeKey }[] = [
  { label: "1H", key: "1h" },
  { label: "1D", key: "1d" },
  { label: "7D", key: "7d" },
  { label: "30D", key: "30d" },
  { label: "90D", key: "90d" },
  { label: "1Y", key: "1y" },
  { label: "All", key: "all" },
];

const CG_DAYS: Record<string, number> = {
  "1d": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "1y": 365,
};

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
  const isDark = useIsDark();
  const [range, setRange] = useState<RangeKey>("7d");
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
  const [detailsLoaded, setDetailsLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const lastDetailsFetch = useRef("");

  const isBinanceRange = range === "1h" || range === "all";
  const displayCurrency = isBinanceRange ? "usd" : currency;
  const chartKey = `${id}|${range}|${displayCurrency}|${chartType}`;
  const detailsKey = `${id}|${currency}`;
  const binanceEnabled =
    detailsLoaded &&
    typeof details?.rank === "number" &&
    details.rank <= 300 &&
    typeof details?.symbol === "string" &&
    details.symbol.length > 0;

  // Chart data load
  useEffect(() => {
    setChartData(null);
    setChartError("");
    let ignore = false;
    const controller = new AbortController();

    const binance = range === "1h" || range === "all";
    if (binance && !detailsLoaded) {
      setChartLoading(true);
      return () => {
        ignore = true;
        controller.abort();
      };
    }

    async function load() {
      setChartLoading(true);
      try {
        let url: string;
        if (binance) {
          const sym = details?.symbol ?? "";
          if (!sym) throw new Error("Coin symbol not available");
          url = `/api/klines?symbol=${encodeURIComponent(sym)}&range=${range}`;
        } else {
          const days = CG_DAYS[range];
          url =
            chartType === "line"
              ? `/api/coins/${id}?days=${days}&currency=${currency}`
              : `/api/coins/${encodeURIComponent(id)}/ohlc?days=${days}&currency=${currency}`;
        }
        const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load");
        if (ignore) return;
        if (chartType === "line") {
          if (binance) {
            const candles: [number, number, number, number, number][] = data.candles ?? [];
            const prices: [number, number][] = candles.map((c) => [c[0], c[4]]);
            setChartData({ type: "line", prices, key: chartKey });
          } else {
            setChartData({ type: "line", prices: data.prices ?? [], key: chartKey });
          }
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
        }
      }
    }
    load();
    return () => {
      ignore = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, range, currency, chartType, retry, detailsLoaded, details?.symbol]);

  // Details load
  useEffect(() => {
    if (lastDetailsFetch.current === detailsKey) return;
    let ignore = false;
    lastDetailsFetch.current = detailsKey;
    setDetails(null);
    setDetailsError(false);
    setDetailsLoaded(false);
    async function loadDetails() {
      try {
        const res = await fetch(
          `/api/coins/${encodeURIComponent(id)}/details?currency=${currency}`,
          { cache: "no-store" }
        );
        if (!res.ok) {
          if (!ignore) {
            setDetailsError(true);
            setDetailsLoaded(true);
          }
          return;
        }
        const data = await res.json();
        if (!ignore) {
          setDetails(data);
          setDetailsError(false);
          setDetailsLoaded(true);
        }
      } catch {
        if (!ignore) {
          setDetailsError(true);
          setDetailsLoaded(true);
        }
      }
    }
    loadDetails();
    return () => {
      ignore = true;
    };
  }, [id, currency, detailsKey]);

  // Chart draw
  useEffect(() => {
    if (!containerRef.current) return;
    if (!chartData || chartData.key !== chartKey) return;
    if (chartData.type === "line" && chartData.prices.length === 0) return;
    if (chartData.type === "candles" && chartData.candles.length === 0) return;

    const hints: string[] = [];

    const chart = createChart(containerRef.current, {
      autoSize: true,
      localization: {
        priceFormatter: (p: number) => formatMoney(p, displayCurrency),
      },
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: isDark ? "#9ca3af" : "#374151",
      },
      grid: {
        vertLines: { color: isDark ? "#374151" : "#e5e7eb" },
        horzLines: { color: isDark ? "#374151" : "#e5e7eb" },
      },
      crosshair: {
        vertLine: { color: isDark ? "#6b7280" : "#9ca3af" },
        horzLine: { color: isDark ? "#6b7280" : "#9ca3af" },
      },
      rightPriceScale: {
        borderColor: isDark ? "#374151" : "#d1d5db",
      },
      timeScale: {
        borderColor: isDark ? "#374151" : "#d1d5db",
        ...(range === "1h"
          ? { timeVisible: true, secondsVisible: false }
          : range === "all"
            ? { timeVisible: false, secondsVisible: false }
            : { timeVisible: range === "1d" || range === "7d" }),
      },
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
          color: isDark ? "#f59e0b" : "#b45309",
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
  }, [chartData, range, currency, chartType, chartKey, showSMA20, showSMA50, showRSI, showMACD, displayCurrency, isDark]);

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
      if (n == null) return "text-[var(--muted)]";
      return n >= 0 ? "text-green-700 dark:text-green-500" : "text-red-700 dark:text-red-500";
    }
    return "text-[var(--foreground)]";
  }

  const plainText = (details?.description ?? "").replace(/<[^>]*>/g, "");
  const truncated = plainText.length > 600 ? plainText.slice(0, 600) + "..." : plainText;

  return (
    <main className="mx-auto max-w-4xl w-full min-w-0 px-4 py-6 pb-24 md:px-6 md:py-6 md:pb-0">
      <Link href="/" className="inline-flex min-h-11 items-center text-sm text-[var(--muted)] hover:underline">
        ← Back
      </Link>

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {details?.image ? (
            <img src={details.image} alt={details.name ?? id} className="h-10 w-10 shrink-0 rounded md:h-12 md:w-12" />
          ) : (
            <div className="h-10 w-10 shrink-0 rounded bg-[var(--skeleton)] animate-pulse md:h-12 md:w-12" />
          )}
          <div className="min-w-0">
            <h1 className="truncate text-xl font-medium md:text-3xl md:font-bold">
              {details?.name ?? (chartLoading ? <span className="animate-pulse" /> : id)}
            </h1>
            <p className="truncate text-xs uppercase text-[var(--muted)] md:text-sm">
              {details?.symbol?.toUpperCase() ?? ""}
              {details?.rank != null && (
                <span className="ml-2 text-xs text-[var(--muted)]">Rank #{details.rank}</span>
              )}
            </p>
          </div>
        </div>
        {details?.price != null && (
          <div className="flex items-baseline gap-2 md:hidden">
            <span className="text-3xl font-medium tabular-nums">
              {formatMoney(details.price, displayCurrency)}
            </span>
            {details.change24h != null && (
              <span
                className={`text-sm font-medium ${
                  details.change24h >= 0 ? "text-green-700 dark:text-green-500" : "text-red-700 dark:text-red-500"
                }`}
              >
                {details.change24h.toFixed(2)}%
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto w-full min-w-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {RANGES.map((r) => {
          const isBin = r.key === "1h" || r.key === "all";
          const disabled = isBin && !binanceEnabled;
          return (
            <button
              key={r.key}
              onClick={() => {
                if (!disabled) setRange(r.key);
              }}
              disabled={disabled}
              title={disabled ? "Only available for top coins listed on Binance" : undefined}
              className={`shrink-0 whitespace-nowrap min-h-11 rounded-lg border px-4 py-2 md:min-h-0 ${
                range === r.key
                  ? "border-green-500 bg-green-500 text-black"
                  : "border-[var(--input-border)]"
              } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {r.label}
            </button>
          );
        })}
        <div className="ml-2 flex shrink-0 gap-1">
          <button
            onClick={() => setChartType("line")}
            className={`shrink-0 whitespace-nowrap min-h-11 rounded-lg border px-4 py-2 md:min-h-0 ${
              chartType === "line"
                ? "border-green-500 bg-green-500 text-black"
                : "border-[var(--input-border)]"
            }`}
          >
            Line
          </button>
          <button
            onClick={() => setChartType("candles")}
            className={`shrink-0 whitespace-nowrap min-h-11 rounded-lg border px-4 py-2 md:min-h-0 ${
              chartType === "candles"
                ? "border-green-500 bg-green-500 text-black"
                : "border-[var(--input-border)]"
            }`}
          >
            Candles
          </button>
        </div>
      </div>

      {isBinanceRange && (
        <p className="mb-2 text-xs text-[var(--muted)]">
          1H and All use Binance prices in USD (USDT).
        </p>
      )}

      <div className="mb-4 flex gap-2 overflow-x-auto w-full min-w-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <button
          onClick={() => setShowSMA20((v) => !v)}
          className={`shrink-0 whitespace-nowrap min-h-11 rounded-lg border px-3 py-1 text-sm md:min-h-0 ${
            showSMA20 ? "border-yellow-500 bg-yellow-500 text-black" : "border-[var(--input-border)]"
          }`}
        >
          SMA 20
        </button>
        <button
          onClick={() => setShowSMA50((v) => !v)}
          className={`shrink-0 whitespace-nowrap min-h-11 rounded-lg border px-3 py-1 text-sm md:min-h-0 ${
            showSMA50 ? "border-blue-500 bg-blue-500 text-black" : "border-[var(--input-border)]"
          }`}
        >
          SMA 50
        </button>
        <button
          onClick={() => setShowRSI((v) => !v)}
          className={`shrink-0 whitespace-nowrap min-h-11 rounded-lg border px-3 py-1 text-sm md:min-h-0 ${
            showRSI ? "border-purple-500 bg-purple-500 text-black" : "border-[var(--input-border)]"
          }`}
        >
          RSI
        </button>
        <button
          onClick={() => setShowMACD((v) => !v)}
          className={`shrink-0 whitespace-nowrap min-h-11 rounded-lg border px-3 py-1 text-sm md:min-h-0 ${
            showMACD ? "border-cyan-500 bg-cyan-500 text-black" : "border-[var(--input-border)]"
          }`}
        >
          MACD
        </button>
      </div>

      {indicatorHint && <p className="mb-2 text-sm text-[var(--muted)]">{indicatorHint}</p>}

      {chartLoading ? (
        <div className={`w-full animate-pulse rounded bg-[var(--skeleton)] ${showRSI || showMACD ? "h-[480px] md:h-[520px]" : "h-[300px] md:h-[400px]"}`} />
      ) : chartError ? (
        <div className={`w-full rounded bg-[var(--card-bg)] flex flex-col items-center justify-center gap-4 ${showRSI || showMACD ? "h-[480px] md:h-[520px]" : "h-[300px] md:h-[400px]"}`}>
          <p className="text-red-700 dark:text-red-500">{chartError}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setRetry((r) => r + 1)}
              className="min-h-11 rounded-lg border border-[var(--input-border)] px-4 py-2 md:min-h-0"
            >
              Try again
            </button>
            {isBinanceRange && (
              <button
                onClick={() => setRange("7d")}
                className="min-h-11 rounded-lg border border-[var(--input-border)] px-4 py-2 text-sm md:min-h-0"
              >
                Switch to 7D
              </button>
            )}
          </div>
        </div>
      ) : (
        <div ref={containerRef} className={`w-full min-w-0 ${showRSI || showMACD ? "h-[480px] md:h-[520px]" : "h-[300px] md:h-[400px]"}`} />
      )}

      {!detailsError && details ? (
        <div className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">
          {STATS.map((s) => {
            const val = statValue(s.key);
            return (
              <div key={s.key} className="p-3 rounded bg-[var(--card-bg)] border border-[var(--card-border)] md:p-3">
                <p className="text-xs text-[var(--muted)]">{s.label}</p>
                <p className={`truncate text-sm font-medium ${statColor(s.key)}`}>{val}</p>
              </div>
            );
          })}
        </div>
      ) : null}

      {!detailsError && details ? (
        <div className="mt-6">
          <h2 className="mb-2 text-xl font-semibold">About</h2>
          <p className="mb-2 max-w-2xl text-sm leading-relaxed text-[var(--foreground)] md:text-base">
            {expanded ? plainText : truncated}
          </p>
          {plainText.length > 600 && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="min-h-11 text-sm text-blue-500 underline md:min-h-0"
            >
              {expanded ? "Show less" : "Read more"}
            </button>
          )}
          {details.homepage && (
            <a
              href={details.homepage}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex min-h-11 items-center text-sm text-blue-500 underline md:min-h-0"
            >
              Website
            </a>
          )}
        </div>
      ) : null}
    </main>
  );
}
