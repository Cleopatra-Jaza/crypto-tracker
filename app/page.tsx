"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

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

type SortKey =
  | "name"
  | "current_price"
  | "price_change_percentage_24h"
  | "price_change_percentage_7d_in_currency"
  | "market_cap"
  | "total_volume";

const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 2,
});

export default function Home() {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showWatchlist, setShowWatchlist] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [watchlistError, setWatchlistError] = useState("");

  const [sortKey, setSortKey] = useState<SortKey>("market_cap");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const prevPricesRef = useRef<Record<string, number>>({});
  const timeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [flash, setFlash] = useState<Record<string, "up" | "down">>({});

  useEffect(() => {
    const prev = prevPricesRef.current;
    const newFlash: Record<string, "up" | "down"> = {};
    let hasFlash = false;
    coins.forEach((c) => {
      const p = prev[c.id];
      if (p !== undefined && p !== c.current_price) {
        newFlash[c.id] = c.current_price > p ? "up" : "down";
        hasFlash = true;
      }
    });

    const next: Record<string, number> = {};
    coins.forEach((c) => {
      next[c.id] = c.current_price;
    });
    prevPricesRef.current = next;

    if (!hasFlash) return;

    Object.keys(newFlash).forEach((id) => {
      if (timeoutsRef.current[id]) clearTimeout(timeoutsRef.current[id]);
    });

    setFlash((f) => ({ ...f, ...newFlash }));

    Object.keys(newFlash).forEach((id) => {
      timeoutsRef.current[id] = setTimeout(() => {
        setFlash((f) => {
          const copy = { ...f };
          delete copy[id];
          return copy;
        });
        delete timeoutsRef.current[id];
      }, 1000);
    });
  }, [coins]);

  useEffect(() => {
    return () => {
      Object.values(timeoutsRef.current).forEach(clearTimeout);
    };
  }, []);

  async function loadCoins() {
    try {
      const res = await fetch("/api/coins");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setCoins(data);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCoins();
    const timer = setInterval(loadCoins, 60000);
    return () => clearInterval(timer);
  }, []);

  async function loadWatchlist() {
    try {
      const res = await fetch("/api/watchlist");
      if (res.status === 401) {
        setSignedIn(false);
        try {
          const saved = localStorage.getItem("watchlist");
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) setWatchlist(parsed);
          }
        } catch {}
        setLoaded(true);
        return;
      }
      setSignedIn(true);
      let local: string[] = [];
      try {
        const saved = localStorage.getItem("watchlist");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) local = parsed;
        }
      } catch {}
      if (local.length > 0) {
        try {
          await fetch("/api/watchlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ coinIds: local }),
          });
        } catch {}
      }
      const res2 = await fetch("/api/watchlist");
      if (res2.ok) {
        const data = await res2.json();
        if (Array.isArray(data?.coinIds)) setWatchlist(data.coinIds);
      }
      try {
        localStorage.removeItem("watchlist");
      } catch {}
      setLoaded(true);
    } catch {
      setSignedIn(false);
      try {
        const saved = localStorage.getItem("watchlist");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setWatchlist(parsed);
        }
      } catch {}
      setLoaded(true);
    }
  }

  useEffect(() => {
    loadWatchlist();
  }, []);

  useEffect(() => {
    if (loaded && !signedIn) {
      try {
        localStorage.setItem("watchlist", JSON.stringify(watchlist));
      } catch {}
    }
  }, [watchlist, loaded, signedIn]);

  function toggleWatch(id: string) {
    if (!signedIn) {
      setWatchlist((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
      return;
    }

    const wasIn = watchlist.includes(id);
    setWatchlist((prev) =>
      wasIn ? prev.filter((x) => x !== id) : [...prev, id]
    );

    (async () => {
      try {
        if (wasIn) {
          const res = await fetch(`/api/watchlist/${encodeURIComponent(id)}`, {
            method: "DELETE",
          });
          if (!res.ok) throw new Error("Failed");
        } else {
          const res = await fetch("/api/watchlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ coinId: id }),
          });
          if (!res.ok) throw new Error("Failed");
        }
        setWatchlistError("");
      } catch {
        setWatchlist((prev) =>
          wasIn ? [...prev, id] : prev.filter((x) => x !== id)
        );
        setWatchlistError("Failed to update watchlist");
      }
    })();
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const filtered = coins.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.symbol.toLowerCase().includes(search.toLowerCase());
    const matchWatch = !showWatchlist || watchlist.includes(c.id);
    return matchSearch && matchWatch;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === "name") {
      const cmp = a.name.localeCompare(b.name);
      return sortDir === "asc" ? cmp : -cmp;
    }
    const an = (a[sortKey] as number | null) ?? 0;
    const bn = (b[sortKey] as number | null) ?? 0;
    return sortDir === "asc" ? an - bn : bn - an;
  });

  function arrow(key: SortKey) {
    if (sortKey !== key) return "";
    return sortDir === "desc" ? " ↓" : " ↑";
  }

  function headerClass(extra?: string) {
    return `p-3 cursor-pointer select-none ${extra ?? ""}`;
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-4 text-3xl font-bold">Crypto Tracker</h1>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setShowWatchlist(false)}
          className={`rounded-lg border px-4 py-2 ${
            !showWatchlist
              ? "border-green-500 bg-green-500 text-black"
              : "border-gray-500"
          }`}
        >
          All Coins
        </button>
        <button
          onClick={() => setShowWatchlist(true)}
          className={`rounded-lg border px-4 py-2 ${
            showWatchlist
              ? "border-green-500 bg-green-500 text-black"
              : "border-gray-500"
          }`}
        >
          ⭐ Watchlist ({watchlist.length})
        </button>
      </div>

      {!signedIn && loaded && (
        <p className="mb-4 text-sm text-gray-400">
          Sign in to sync your watchlist across devices.
        </p>
      )}
      {watchlistError && (
        <p className="mb-4 text-sm text-red-500">{watchlistError}</p>
      )}

      <input
        type="text"
        placeholder="Search coin (bitcoin, eth...)"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full rounded-lg border border-gray-400 bg-transparent p-3"
      />

      {loading ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <tbody>
              {Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-700">
                  <td className="p-3">
                    <div className="h-5 w-5 animate-pulse rounded bg-gray-700" />
                  </td>
                  <td className="p-3">
                    <div className="h-4 w-6 animate-pulse rounded bg-gray-700" />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-6 w-6 animate-pulse rounded-full bg-gray-700" />
                      <div className="h-4 w-24 animate-pulse rounded bg-gray-700" />
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <div className="ml-auto h-4 w-16 animate-pulse rounded bg-gray-700" />
                  </td>
                  <td className="p-3 text-right">
                    <div className="ml-auto h-4 w-12 animate-pulse rounded bg-gray-700" />
                  </td>
                  <td className="p-3 text-right hidden md:table-cell">
                    <div className="ml-auto h-4 w-12 animate-pulse rounded bg-gray-700" />
                  </td>
                  <td className="p-3 text-right hidden md:table-cell">
                    <div className="ml-auto h-4 w-12 animate-pulse rounded bg-gray-700" />
                  </td>
                  <td className="p-3 text-right hidden md:table-cell">
                    <div className="ml-auto h-4 w-16 animate-pulse rounded bg-gray-700" />
                  </td>
                  <td className="p-3 text-right hidden md:table-cell">
                    <div className="ml-auto h-4 w-16 animate-pulse rounded bg-gray-700" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {error && <p className="text-red-500">Error: {error}</p>}
      {showWatchlist && watchlist.length === 0 && (
        <p className="text-gray-400">
          Watchlist empty. Coin pakkathula irukkra ☆ click pannunga.
        </p>
      )}

      {!loading && (
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-500">
              <th className="p-3"></th>
              <th className="p-3">#</th>
              <th
                className={headerClass()}
                onClick={() => handleSort("name")}
              >
                Coin{arrow("name")}
              </th>
              <th
                className={headerClass("text-right")}
                onClick={() => handleSort("current_price")}
              >
                Price{arrow("current_price")}
              </th>
              <th
                className={headerClass("text-right")}
                onClick={() => handleSort("price_change_percentage_24h")}
              >
                24h{arrow("price_change_percentage_24h")}
              </th>
              <th
                className={headerClass("text-right hidden md:table-cell")}
                onClick={() =>
                  handleSort("price_change_percentage_7d_in_currency")
                }
              >
                7d{arrow("price_change_percentage_7d_in_currency")}
              </th>
              <th className="p-3 text-right hidden md:table-cell">30d</th>
              <th
                className={headerClass("text-right hidden md:table-cell")}
                onClick={() => handleSort("market_cap")}
              >
                Market cap{arrow("market_cap")}
              </th>
              <th
                className={headerClass("text-right hidden md:table-cell")}
                onClick={() => handleSort("total_volume")}
              >
                Volume{arrow("total_volume")}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((coin) => {
              const change = coin.price_change_percentage_24h ?? 0;
              const starred = watchlist.includes(coin.id);
              const pct7 = coin.price_change_percentage_7d_in_currency;
              const pct30 = coin.price_change_percentage_30d_in_currency;
              return (
                <tr key={coin.id} className="border-b border-gray-700">
                  <td className="p-3">
                    <button
                      onClick={() => toggleWatch(coin.id)}
                      className="text-xl"
                      aria-label="Toggle watchlist"
                    >
                      {starred ? "⭐" : "☆"}
                    </button>
                  </td>
                  <td className="p-3">{coin.market_cap_rank ?? "-"}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={coin.image} alt={coin.name} className="h-6 w-6" />
                      <Link
                        href={`/coin/${coin.id}`}
                        className="font-medium hover:underline"
                      >
                        {coin.name}
                      </Link>
                      <span className="text-sm uppercase text-gray-400">
                        {coin.symbol}
                      </span>
                    </div>
                  </td>
                  <td
                    className={`p-3 text-right transition-colors duration-500 ${
                      flash[coin.id] === "up"
                        ? "bg-green-500/20 text-green-500"
                        : flash[coin.id] === "down"
                        ? "bg-red-500/20 text-red-500"
                        : ""
                    }`}
                  >
                    ${coin.current_price.toLocaleString()}
                  </td>
                  <td
                    className={`p-3 text-right ${
                      change >= 0 ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {change.toFixed(2)}%
                  </td>
                  <td
                    className={`p-3 text-right hidden md:table-cell ${
                      pct7 == null
                        ? ""
                        : pct7 >= 0
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                  >
                    {pct7 == null ? "-" : `${pct7.toFixed(2)}%`}
                  </td>
                  <td
                    className={`p-3 text-right hidden md:table-cell ${
                      pct30 == null
                        ? ""
                        : pct30 >= 0
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                  >
                    {pct30 == null ? "-" : `${pct30.toFixed(2)}%`}
                  </td>
                  <td className="p-3 text-right hidden md:table-cell">
                    {coin.market_cap == null
                      ? "-"
                      : compact.format(coin.market_cap)}
                  </td>
                  <td className="p-3 text-right hidden md:table-cell">
                    {coin.total_volume == null
                      ? "-"
                      : compact.format(coin.total_volume)}
                  </td>
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
