"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/currency";

type Coin = {
  id: string;
  name: string;
  symbol: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number;
};

type FearGreed = { value: number; classification: string; timestamp: number } | null;
type TrendingCoin = { id: string; name: string; symbol: string; thumb: string; rank: number | null };

export default function MarketOverview({
  coins,
  currency,
}: {
  coins: Coin[];
  currency: string;
}) {
  const [fearGreed, setFearGreed] = useState<FearGreed>(null);
  const [fgError, setFgError] = useState(false);
  const [fgLoading, setFgLoading] = useState(true);
  const [trending, setTrending] = useState<TrendingCoin[]>([]);
  const [trError, setTrError] = useState(false);
  const [trLoading, setTrLoading] = useState(true);
  const [showGainers, setShowGainers] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/fear-greed", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error("fail");
        return r.json();
      })
      .then((data) => {
        if (!cancelled && typeof data?.value === "number") setFearGreed(data);
        else if (!cancelled) setFgError(true);
      })
      .catch(() => { if (!cancelled) setFgError(true); })
      .finally(() => { if (!cancelled) setFgLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/trending", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error("fail");
        return r.json();
      })
      .then((data) => {
        if (!cancelled && Array.isArray(data?.coins)) setTrending(data.coins);
        else if (!cancelled) setTrError(true);
      })
      .catch(() => { if (!cancelled) setTrError(true); })
      .finally(() => { if (!cancelled) setTrLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const valid = coins.filter((c) => typeof c.price_change_percentage_24h === "number" && Number.isFinite(c.price_change_percentage_24h));
  const sorted = [...valid].sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h);
  const gainers = sorted.slice(0, 5);
  const losers = [...sorted].reverse().slice(0, 5);

  function fgColor(v: number) {
    if (v <= 24) return "bg-red-500";
    if (v <= 44) return "bg-orange-500";
    if (v <= 55) return "bg-gray-400";
    if (v <= 75) return "bg-lime-500";
    return "bg-green-500";
  }

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 min-w-0 md:grid-cols-3">
      <div className="min-w-0 rounded-lg border border-gray-700 bg-gray-800 p-4">
        <h3 className="mb-2 text-sm font-semibold text-gray-300">Fear & Greed</h3>
        {fgLoading ? (
          <div className="space-y-2">
            <div className="h-8 w-20 animate-pulse rounded bg-gray-700" />
            <div className="h-3 w-full animate-pulse rounded bg-gray-700" />
          </div>
        ) : fgError || !fearGreed ? (
          <p className="text-sm text-gray-400">Unavailable</p>
        ) : (
          <>
            <div className="mb-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold">{fearGreed.value}</span>
              <span className="text-sm text-gray-300">{fearGreed.classification}</span>
            </div>
            <div className="relative mt-2 h-2 w-full rounded bg-gray-700">
              <div
                className={`absolute top-0 h-2 w-2 -translate-x-1/2 rounded-full ${fgColor(fearGreed.value)}`}
                style={{ left: `${Math.min(100, Math.max(0, fearGreed.value))}%` }}
              />
              <div className="h-2 rounded bg-gradient-to-r from-red-500 via-gray-400 to-green-500 opacity-40" />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Source:{" "}
              <a
                href="https://alternative.me/crypto/fear-and-greed-index/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-gray-300"
              >
                alternative.me
              </a>
            </p>
          </>
        )}
      </div>

      <div className="min-w-0 rounded-lg border border-gray-700 bg-gray-800 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-300">Top gainers / losers (24h)</h3>
        </div>
        <div className="mb-2 flex gap-1">
          <button
            onClick={() => setShowGainers(true)}
            className={`rounded px-2 py-0.5 text-xs ${showGainers ? "bg-green-600 text-white" : "bg-gray-700 text-gray-300"}`}
          >
            Gainers
          </button>
          <button
            onClick={() => setShowGainers(false)}
            className={`rounded px-2 py-0.5 text-xs ${!showGainers ? "bg-red-600 text-white" : "bg-gray-700 text-gray-300"}`}
          >
            Losers
          </button>
        </div>
        {(showGainers ? gainers : losers).length === 0 ? (
          <p className="text-sm text-gray-400">No data</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {(showGainers ? gainers : losers).map((c) => (
              <li key={c.id}>
                <Link href={`/coin/${c.id}`} className="flex items-center gap-2 min-w-0 hover:underline">
                  <span className="flex items-center gap-2 min-w-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.image} alt={c.name} className="h-4 w-4 shrink-0 rounded-full" />
                    <span className="truncate uppercase">{c.symbol}</span>
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className={`whitespace-nowrap ${c.price_change_percentage_24h >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {c.price_change_percentage_24h >= 0 ? "+" : ""}{c.price_change_percentage_24h.toFixed(2)}%
                    </span>
                    <span className="ml-auto text-xs md:text-sm text-gray-400 whitespace-nowrap shrink-0">{formatMoney(c.current_price, currency)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="min-w-0 rounded-lg border border-gray-700 bg-gray-800 p-4">
        <h3 className="mb-2 text-sm font-semibold text-gray-300">Trending</h3>
        {trLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-4 w-full animate-pulse rounded bg-gray-700" />
            ))}
          </div>
        ) : trError ? (
          <p className="text-sm text-gray-400">Unavailable</p>
        ) : trending.length === 0 ? (
          <p className="text-sm text-gray-400">No data</p>
        ) : (
          <ul className="space-y-1 text-sm">
          {trending.map((c) => (
            <li key={c.id}>
              <Link href={`/coin/${c.id}`} className="flex items-center justify-between gap-2 min-w-0 hover:underline">
                <span className="flex items-center gap-2 min-w-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.thumb} alt={c.name} className="h-4 w-4 shrink-0 rounded-full" />
                  <span className="truncate">{c.name}</span>
                  <span className="uppercase text-gray-500 shrink-0">{c.symbol}</span>
                </span>
                {c.rank != null && <span className="text-xs shrink-0 text-gray-500">#{c.rank}</span>}
              </Link>
            </li>
          ))}
          </ul>
        )}
      </div>
    </div>
  );
}
