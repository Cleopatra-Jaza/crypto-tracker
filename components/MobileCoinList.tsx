"use client";

import { useState } from "react";
import Link from "next/link";
import { formatCompactMoney, formatMoney } from "@/lib/currency";

type Coin = {
  id: string;
  name: string;
  symbol: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  market_cap_rank: number | null;
  total_volume: number | null;
  price_change_percentage_7d_in_currency: number | null;
  price_change_percentage_30d_in_currency: number | null;
};

type SearchResult = {
  id: string;
  name: string;
  symbol: string;
  thumb: string | null;
  rank: number | null;
};

type SortKey =
  | "name"
  | "current_price"
  | "price_change_percentage_24h"
  | "price_change_percentage_7d_in_currency"
  | "price_change_percentage_30d_in_currency"
  | "market_cap"
  | "total_volume";

export default function MobileCoinList({
  coins,
  loading,
  currency,
  watchlist,
  toggleWatch,
  flash,
  search,
  setSearch,
  showWatchlist,
  setShowWatchlist,
  sortKey,
  sortDir,
  setSortKey,
  setSortDir,
  searchResults,
  searchLoading,
  searchError,
  watchlistCount,
  watchlistError,
}: {
  coins: Coin[];
  loading: boolean;
  currency: string;
  watchlist: string[];
  toggleWatch: (id: string) => void;
  flash: Record<string, "up" | "down">;
  search: string;
  setSearch: (v: string) => void;
  showWatchlist: boolean;
  setShowWatchlist: (v: boolean) => void;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  setSortKey: (k: SortKey) => void;
  setSortDir: (d: "asc" | "desc") => void;
  searchResults: SearchResult[];
  searchLoading: boolean;
  searchError: string;
  watchlistCount: number;
  watchlistError: string;
}) {
  const [period, setPeriod] = useState<"24h" | "7d" | "30d">("24h");

  function percentFor(c: Coin): number | null {
    if (period === "24h") return c.price_change_percentage_24h;
    if (period === "7d") return c.price_change_percentage_7d_in_currency;
    return c.price_change_percentage_30d_in_currency;
  }

  function changeSortKey(): SortKey {
    if (period === "24h") return "price_change_percentage_24h";
    if (period === "7d") return "price_change_percentage_7d_in_currency";
    return "price_change_percentage_30d_in_currency";
  }

  function handleSortChip(key: "market_cap" | "current_price" | "change") {
    const target: SortKey =
      key === "market_cap"
        ? "market_cap"
        : key === "current_price"
        ? "current_price"
        : changeSortKey();
    if (sortKey === target) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortKey(target);
      setSortDir("desc");
    }
  }

  function isSortActive(key: "market_cap" | "current_price" | "change"): boolean {
    if (key === "market_cap") return sortKey === "market_cap";
    if (key === "current_price") return sortKey === "current_price";
    return (
      sortKey === "price_change_percentage_24h" ||
      sortKey === "price_change_percentage_7d_in_currency" ||
      sortKey === "price_change_percentage_30d_in_currency"
    );
  }

  const changeArrow = isSortActive("change") ? (sortDir === "desc" ? " ↓" : " ↑") : "";
  const marketCapArrow = isSortActive("market_cap") ? (sortDir === "desc" ? " ↓" : " ↑") : "";
  const priceArrow = isSortActive("current_price") ? (sortDir === "desc" ? " ↓" : " ↑") : "";

  const sorted = coins; // already sorted/filtered from page

  function RowSkeleton() {
    return (
      <div className="flex items-center gap-3 border-b border-[var(--card-border)] py-3 min-h-[64px] animate-pulse">
        <div className="h-4 w-6 rounded bg-[var(--skeleton)]" />
        <div className="h-8 w-8 rounded-full bg-[var(--skeleton)] shrink-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-24 rounded bg-[var(--skeleton)]" />
          <div className="h-3 w-32 rounded bg-[var(--skeleton)]" />
        </div>
        <div className="text-right space-y-2">
          <div className="ml-auto h-4 w-16 rounded bg-[var(--skeleton)]" />
          <div className="ml-auto h-3 w-12 rounded bg-[var(--skeleton)]" />
        </div>
        <div className="h-11 w-11 rounded bg-[var(--skeleton)]" />
      </div>
    );
  }

  return (
    <div className="md:hidden w-full min-w-0">
      <div className="flex w-full gap-1 mb-3">
        <button
          onClick={() => setShowWatchlist(false)}
          className={`flex-1 min-h-11 rounded-lg border ${
            !showWatchlist ? "border-green-500 bg-green-500 text-black" : "border-[var(--input-border)]"
          }`}
        >
          All Coins
        </button>
        <button
          onClick={() => setShowWatchlist(true)}
          className={`flex-1 min-h-11 rounded-lg border ${
            showWatchlist ? "border-green-500 bg-green-500 text-black" : "border-[var(--input-border)]"
          }`}
        >
          ⭐ Watchlist ({watchlistCount})
        </button>
      </div>

      <input
        type="text"
        placeholder="Search coin (bitcoin, eth...)"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-3 w-full min-h-11 rounded-lg border border-[var(--input-border)] bg-transparent p-3"
      />

      <div className="mb-3 flex gap-1">
        {(["24h", "7d", "30d"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-lg border px-3 py-1 text-sm ${
              period === p ? "border-green-500 bg-green-500 text-black" : "border-[var(--input-border)]"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="mb-3 flex gap-2 flex-wrap">
        <button
          onClick={() => handleSortChip("market_cap")}
          className={`rounded-full border px-3 py-1 text-sm ${
            isSortActive("market_cap") ? "border-green-500 bg-green-500 text-black" : "border-[var(--input-border)]"
          }`}
        >
          Market cap{marketCapArrow}
        </button>
        <button
          onClick={() => handleSortChip("current_price")}
          className={`rounded-full border px-3 py-1 text-sm ${
            isSortActive("current_price") ? "border-green-500 bg-green-500 text-black" : "border-[var(--input-border)]"
          }`}
        >
          Price{priceArrow}
        </button>
        <button
          onClick={() => handleSortChip("change")}
          className={`rounded-full border px-3 py-1 text-sm ${
            isSortActive("change") ? "border-green-500 bg-green-500 text-black" : "border-[var(--input-border)]"
          }`}
        >
          Change{changeArrow}
        </button>
      </div>

      {loading ? (
        <div className="w-full min-w-0">
          {Array.from({ length: 10 }).map((_, i) => (
            <RowSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="w-full min-w-0">
          {sorted.map((coin) => {
            const starred = watchlist.includes(coin.id);
            const pct = percentFor(coin);
            const changeColor =
              pct == null ? "text-[var(--muted)]" : pct >= 0 ? "text-green-500" : "text-red-700 dark:text-red-500";
            const pctText = pct == null ? "-" : `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
            const flashClass =
              flash[coin.id] === "up"
                ? "bg-green-500/20"
                : flash[coin.id] === "down"
                ? "bg-red-500/20"
                : "";
            return (
              <div key={coin.id} className={`flex items-center gap-3 border-b border-[var(--card-border)] py-3 min-h-[64px] ${flashClass}`}>
                <Link href={`/coin/${coin.id}`} className="flex flex-1 items-center gap-3 min-w-0">
                  <span className="w-6 shrink-0 text-xs text-[var(--muted)]">{coin.market_cap_rank ?? "-"}</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coin.image} alt={coin.name} className="h-8 w-8 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{coin.name}</div>
                    <div className="truncate text-xs text-[var(--muted)]">
                      {coin.symbol.toUpperCase()} · {formatCompactMoney(coin.market_cap, currency)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="whitespace-nowrap text-sm font-medium">{formatMoney(coin.current_price, currency)}</div>
                    <div className={`whitespace-nowrap text-xs font-medium ${changeColor}`}>{pctText}</div>
                  </div>
                </Link>
                <button
                  onClick={() => toggleWatch(coin.id)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center text-xl"
                  aria-label="Toggle watchlist"
                >
                  {starred ? "⭐" : "☆"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showWatchlist && watchlist.length === 0 && (
        <p className="text-[var(--muted)]">Watchlist empty.</p>
      )}

      {watchlistError && <p className="text-sm text-red-700 dark:text-red-500">{watchlistError}</p>}

      {search.length >= 2 && !showWatchlist && (
        <div className="mt-4">
          <h2 className="mb-2 text-lg font-semibold">More coins</h2>
          {searchLoading ? (
            <div className="animate-pulse h-4 w-24 rounded bg-[var(--skeleton)]" />
          ) : searchError ? (
            <p className="text-sm text-red-700 dark:text-red-500">Search failed: {searchError}</p>
          ) : searchResults.filter((r) => !coins.some((c) => c.id === r.id)).length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No other coins found</p>
          ) : (
            <div className="w-full min-w-0">
              {searchResults
                .filter((r) => !coins.some((c) => c.id === r.id))
                .map((r) => (
                  <Link
                    key={r.id}
                    href={`/coin/${r.id}`}
                    className="flex items-center gap-3 border-b border-[var(--card-border)] py-3 min-h-[64px]"
                  >
                    <span className="w-6 shrink-0 text-xs text-[var(--muted)]">{r.rank ?? "-"}</span>
                    {r.thumb ? (
                      <img src={r.thumb} alt={r.name} className="h-8 w-8 shrink-0 rounded-full" />
                    ) : (
                      <div className="h-8 w-8 shrink-0 rounded-full bg-[var(--skeleton)] animate-pulse" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{r.name}</div>
                      <div className="truncate text-xs text-[var(--muted)]">{r.symbol.toUpperCase()}</div>
                    </div>
                  </Link>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}