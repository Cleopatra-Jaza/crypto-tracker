"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Coin = {
  id: string;
  name: string;
  symbol: string;
  image: string;
  current_price: number;
};

type Holding = {
  id: string;
  coinId: string;
  amount: number;
  buyPrice: number;
  createdAt: string;
  userId: string;
};

const money = (n: number) =>
  n.toLocaleString(undefined, { maximumFractionDigits: 2 });

const DONUT_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#a855f7",
  "#14b8a6",
  "#f97316",
  "#ec4899",
];

export default function PortfolioPage() {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unauthorized, setUnauthorized] = useState(false);

  const [coinId, setCoinId] = useState("");
  const [amount, setAmount] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editBuyPrice, setEditBuyPrice] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  async function loadCoins() {
    try {
      const res = await fetch("/api/coins");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load coins");
      setCoins(data);
    } catch (e) {
      // keep previous coins if refresh fails
    }
  }

  async function loadPortfolio() {
    try {
      const res = await fetch("/api/portfolio");
      if (res.status === 401) {
        setUnauthorized(true);
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load portfolio");
      setHoldings(data);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      await Promise.all([loadCoins(), loadPortfolio()]);
      if (!cancelled) setLoading(false);
    }
    init();
    const timer = setInterval(loadCoins, 60000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coinId,
          amount: Number(amount),
          buyPrice: Number(buyPrice),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add");
      setCoinId("");
      setAmount("");
      setBuyPrice("");
      await loadPortfolio();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setActionBusy(true);
    try {
      const res = await fetch(`/api/portfolio/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete");
      }
      if (editingId === id) setEditingId(null);
      await loadPortfolio();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleSave(id: string) {
    const a = Number(editAmount);
    const b = Number(editBuyPrice);
    if (!Number.isFinite(a) || a <= 0 || !Number.isFinite(b) || b < 0) {
      setError("Invalid amount or buy price (amount > 0, buy price >= 0)");
      return;
    }
    setActionBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/portfolio/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: a, buyPrice: b }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      setEditingId(null);
      await loadPortfolio();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setActionBusy(false);
    }
  }

  if (unauthorized) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <h1 className="mb-4 text-3xl font-bold">Portfolio</h1>
        <p className="text-gray-400">
          Please sign in to see your portfolio.{" "}
          <Link href="/api/auth/signin" className="text-blue-500 underline">
            Sign in
          </Link>
        </p>
      </main>
    );
  }

  const coinMap = new Map(coins.map((c) => [c.id, c]));

  const rows = holdings.map((h) => {
    const coin = coinMap.get(h.coinId);
    if (!coin) {
      return { holding: h, coin: null as Coin | null, available: false };
    }
    const currentPrice = coin.current_price;
    const currentValue = h.amount * currentPrice;
    const cost = h.amount * h.buyPrice;
    const profit = currentValue - cost;
    const profitPercent = cost > 0 ? (profit / cost) * 100 : 0;
    return {
      holding: h,
      coin,
      available: true,
      currentPrice,
      currentValue,
      profit,
      profitPercent,
    };
  });

  const totalValue = rows.reduce(
    (sum, r) => (r.available ? sum + (r as { currentValue: number }).currentValue : sum),
    0
  );
  const totalProfit = rows.reduce(
    (sum, r) => (r.available ? sum + (r as { profit: number }).profit : sum),
    0
  );

  // allocation by coin
  const allocMap = new Map<string, { name: string; value: number }>();
  for (const r of rows) {
    if (!r.available) continue;
    const coin = (r as { coin: Coin }).coin;
    const cv = (r as { currentValue: number }).currentValue;
    const existing = allocMap.get(coin.id);
    if (existing) existing.value += cv;
    else allocMap.set(coin.id, { name: coin.name, value: cv });
  }
  const alloc = Array.from(allocMap.entries()).map(([id, v]) => ({
    id,
    name: v.name,
    value: v.value,
    percent: totalValue > 0 ? (v.value / totalValue) * 100 : 0,
  }));

  const donutAlloc = (() => {
    if (alloc.length === 0) return [] as { name: string; percent: number; color: string }[];
    const sorted = [...alloc].sort((a, b) => b.value - a.value);
    const top = sorted.slice(0, 7);
    const rest = sorted.slice(7);
    const items = top.map((a, i) => ({
      name: a.name,
      percent: a.percent,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
    }));
    if (rest.length > 0) {
      const restPercent = rest.reduce((s, r) => s + r.percent, 0);
      items.push({ name: "Other", percent: restPercent, color: "#9ca3af" });
    }
    return items;
  })();

  function csvCell(t: unknown): string {
    const s = String(t ?? "");
    let out = s.replace(/"/g, '""');
    if (/^[=+\-@]/.test(s)) out = "'" + out;
    return '"' + out + '"';
  }

  function exportCSV() {
    if (holdings.length === 0) return;
    const lines: string[] = [];
    const header = [
      "Coin",
      "Symbol",
      "Amount",
      "Buy price (USD)",
      "Current price (USD)",
      "Current value (USD)",
      "Profit/Loss (USD)",
      "Profit/Loss (%)",
    ];
    lines.push(header.map((c) => csvCell(c)).join(","));

    for (const r of rows) {
      const h = r.holding;
      if (!r.available) {
        lines.push(
          [
            csvCell(h.coinId),
            csvCell(""),
            csvCell(String(h.amount)),
            csvCell(String(h.buyPrice.toFixed(2))),
            csvCell(""),
            csvCell(""),
            csvCell(""),
            csvCell(""),
          ].join(",")
        );
        continue;
      }
      const coin = r.coin as Coin;
      const currentValue = r.currentValue as number;
      const profit = r.profit as number;
      const profitPercent = r.profitPercent as number;
      lines.push(
        [
          csvCell(coin.name),
          csvCell(coin.symbol),
          csvCell(String(h.amount)),
          csvCell(String(h.buyPrice.toFixed(2))),
          csvCell(String(coin.current_price.toFixed(2))),
          csvCell(String(currentValue.toFixed(2))),
          csvCell(String(profit.toFixed(2))),
          csvCell(String(profitPercent.toFixed(2))),
        ].join(",")
      );
    }

    const d = new Date();
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    lines.push(
      [
        csvCell("Total"),
        csvCell(""),
        csvCell(""),
        csvCell(""),
        csvCell(""),
        csvCell(String(totalValue.toFixed(2))),
        csvCell(String(totalProfit.toFixed(2))),
        csvCell(""),
      ].join(",")
    );

    const csv = "\uFEFF" + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `crypto-portfolio-${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  let donutOffset = 0;
  const donutSegments = donutAlloc.map((d) => {
    const seg = { ...d, offset: donutOffset };
    donutOffset += d.percent;
    return seg;
  });
  const donutLabel = `Portfolio allocation: ${donutAlloc
    .map((d) => `${d.name} ${d.percent.toFixed(1)}%`)
    .join(", ")}`;

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-4 text-3xl font-bold">Portfolio</h1>

      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}

      <form onSubmit={handleAdd} className="mb-6 flex flex-wrap gap-2">
        <select
          value={coinId}
          onChange={(e) => setCoinId(e.target.value)}
          className="rounded-lg border border-gray-400 bg-transparent p-2"
          required
        >
          <option value="">Select coin</option>
          {coins.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.symbol.toUpperCase()})
            </option>
          ))}
        </select>
        <input
          type="number"
          step="any"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="rounded-lg border border-gray-400 bg-transparent p-2"
          required
        />
        <input
          type="number"
          step="any"
          placeholder="Buy price (USD)"
          value={buyPrice}
          onChange={(e) => setBuyPrice(e.target.value)}
          className="rounded-lg border border-gray-400 bg-transparent p-2"
          required
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg border border-gray-500 px-4 py-2"
        >
          Add
        </button>
      </form>
      {formError && <p className="mb-4 text-red-500">{formError}</p>}

      <div className="mb-4 flex gap-6 flex-wrap items-center">
        <p>
          <span className="font-semibold">Total value: </span>
          ${money(totalValue)}
        </p>
        <p
          className={
            totalProfit >= 0 ? "text-green-500" : "text-red-500"
          }
        >
          <span className="font-semibold text-inherit">
            Total profit/loss:{" "}
          </span>
          ${money(totalProfit)}
        </p>
        <button
          onClick={exportCSV}
          disabled={holdings.length === 0}
          className="rounded-lg border border-gray-500 px-4 py-2"
        >
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-500">
              <th className="p-3">Coin</th>
              <th className="p-3 text-right">Amount</th>
              <th className="p-3 text-right">Buy price</th>
              <th className="p-3 text-right">Current price</th>
              <th className="p-3 text-right">Current value</th>
              <th className="p-3 text-right">P/L USD</th>
              <th className="p-3 text-right">P/L %</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const h = r.holding;
              const editing = editingId === h.id;
              if (!r.available) {
                return (
                  <tr key={h.id} className="border-b border-gray-700">
                    <td className="p-3">{h.coinId}</td>
                    <td className="p-3 text-right">
                      {editing ? (
                        <input
                          type="number"
                          step="any"
                          min={0}
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="w-24 rounded border border-gray-500 bg-transparent p-1 text-right"
                        />
                      ) : (
                        money(h.amount)
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {editing ? (
                        <input
                          type="number"
                          step="any"
                          min={0}
                          value={editBuyPrice}
                          onChange={(e) => setEditBuyPrice(e.target.value)}
                          className="w-24 rounded border border-gray-500 bg-transparent p-1 text-right"
                        />
                      ) : (
                        `$${money(h.buyPrice)}`
                      )}
                    </td>
                    <td className="p-3 text-right text-gray-400">
                      price unavailable
                    </td>
                    <td className="p-3 text-right">—</td>
                    <td className="p-3 text-right">—</td>
                    <td className="p-3 text-right">—</td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        {editing ? (
                          <>
                            <button
                              onClick={() => handleSave(h.id)}
                              disabled={actionBusy}
                              className="rounded-lg border border-gray-500 px-2 py-1"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              disabled={actionBusy}
                              className="rounded-lg border border-gray-500 px-2 py-1"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingId(h.id);
                                setEditAmount(String(h.amount));
                                setEditBuyPrice(String(h.buyPrice));
                              }}
                              disabled={actionBusy || editingId !== null}
                              className="rounded-lg border border-gray-500 px-2 py-1"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(h.id)}
                              disabled={actionBusy}
                              className="rounded-lg border border-gray-500 px-2 py-1"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }
              const rr = r as {
                coin: Coin;
                currentPrice: number;
                currentValue: number;
                profit: number;
                profitPercent: number;
              };
              return (
                <tr key={h.id} className="border-b border-gray-700">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={rr.coin.image}
                        alt={rr.coin.name}
                        className="h-6 w-6"
                      />
                      <span className="font-medium">{rr.coin.name}</span>
                      <span className="text-sm uppercase text-gray-400">
                        {rr.coin.symbol}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    {editing ? (
                      <input
                        type="number"
                        step="any"
                        min={0}
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="w-24 rounded border border-gray-500 bg-transparent p-1 text-right"
                      />
                    ) : (
                      money(h.amount)
                    )}
                  </td>
                  <td className="p-3 text-right">
                    {editing ? (
                      <input
                        type="number"
                        step="any"
                        min={0}
                        value={editBuyPrice}
                        onChange={(e) => setEditBuyPrice(e.target.value)}
                        className="w-24 rounded border border-gray-500 bg-transparent p-1 text-right"
                      />
                    ) : (
                      `$${money(h.buyPrice)}`
                    )}
                  </td>
                  <td className="p-3 text-right">${money(rr.currentPrice)}</td>
                  <td className="p-3 text-right">${money(rr.currentValue)}</td>
                  <td
                    className={`p-3 text-right ${
                      rr.profit >= 0 ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    ${money(rr.profit)}
                  </td>
                  <td
                    className={`p-3 text-right ${
                      rr.profitPercent >= 0 ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {rr.profitPercent.toFixed(2)}%
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      {editing ? (
                        <>
                          <button
                            onClick={() => handleSave(h.id)}
                            disabled={actionBusy}
                            className="rounded-lg border border-gray-500 px-2 py-1"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            disabled={actionBusy}
                            className="rounded-lg border border-gray-500 px-2 py-1"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingId(h.id);
                              setEditAmount(String(h.amount));
                              setEditBuyPrice(String(h.buyPrice));
                            }}
                            disabled={actionBusy || editingId !== null}
                            className="rounded-lg border border-gray-500 px-2 py-1"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(h.id)}
                            disabled={actionBusy}
                            className="rounded-lg border border-gray-500 px-2 py-1"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {alloc.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-xl font-semibold">Allocation</h2>
          <div className="flex flex-col gap-4 md:flex-row md:items-start">
            {donutAlloc.length > 0 && (
              <div className="flex flex-col items-center gap-3 md:flex-row md:items-center">
                <div className="relative" style={{ width: 180, height: 180 }}>
                  <svg
                    viewBox="0 0 42 42"
                    width="180"
                    height="180"
                    role="img"
                    aria-label={donutLabel}
                    className="block -rotate-90"
                  >
                    <circle
                      cx="21"
                      cy="21"
                      r="15.9155"
                      fill="transparent"
                      stroke="#374151"
                      strokeWidth="6"
                    />
                    {donutSegments.map((s, i) => (
                      <circle
                        key={`${s.name}-${i}`}
                        cx="21"
                        cy="21"
                        r="15.9155"
                        fill="transparent"
                        stroke={s.color}
                        strokeWidth="6"
                        strokeDasharray={`${s.percent} ${100 - s.percent}`}
                        strokeDashoffset={-s.offset}
                      />
                    ))}
                  </svg>
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-semibold">
                      ${Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(totalValue)}
                    </span>
                  </div>
                </div>
                <ul className="space-y-1 text-sm">
                  {donutAlloc.map((d, i) => (
                    <li key={`${d.name}-${i}`} className="flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: d.color }}
                      />
                      <span>{d.name}</span>
                      <span className="text-gray-400">{d.percent.toFixed(2)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <ul className="flex-1 space-y-2">
              {alloc.map((a) => (
                <li key={a.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{a.name}</span>
                    <span>{a.percent.toFixed(2)}%</span>
                  </div>
                  <div className="h-2 w-full rounded bg-gray-700">
                    <div
                      className="h-2 rounded bg-blue-500"
                      style={{ width: `${a.percent}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </main>
  );
}
