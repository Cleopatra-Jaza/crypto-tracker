"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Coin = {
  id: string;
  name: string;
  symbol: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
};

export default function Home() {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showWatchlist, setShowWatchlist] = useState(false);

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

  // Watchlist: page open aagum bodhu save pannadha data-va edukkum
  useEffect(() => {
    try {
      const saved = localStorage.getItem("watchlist");
      if (saved) setWatchlist(JSON.parse(saved));
    } catch {}
    setLoaded(true);
  }, []);

  // Watchlist maarum bodhu save pannum
  useEffect(() => {
    if (loaded) {
      localStorage.setItem("watchlist", JSON.stringify(watchlist));
    }
  }, [watchlist, loaded]);

  function toggleWatch(id: string) {
    setWatchlist((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const filtered = coins.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.symbol.toLowerCase().includes(search.toLowerCase());
    const matchWatch = !showWatchlist || watchlist.includes(c.id);
    return matchSearch && matchWatch;
  });

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

      <input
        type="text"
        placeholder="Search coin (bitcoin, eth...)"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full rounded-lg border border-gray-400 bg-transparent p-3"
      />

      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}
      {showWatchlist && watchlist.length === 0 && (
        <p className="text-gray-400">
          Watchlist empty. Coin pakkathula irukkra ☆ click pannunga.
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-500">
              <th className="p-3"></th>
              <th className="p-3">#</th>
              <th className="p-3">Coin</th>
              <th className="p-3 text-right">Price</th>
              <th className="p-3 text-right">24h</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((coin) => {
              const change = coin.price_change_percentage_24h ?? 0;
              const starred = watchlist.includes(coin.id);
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
                  <td className="p-3">{coins.indexOf(coin) + 1}</td>
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
                  <td className="p-3 text-right">
                    ${coin.current_price.toLocaleString()}
                  </td>
                  <td
                    className={`p-3 text-right ${
                      change >= 0 ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {change.toFixed(2)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}