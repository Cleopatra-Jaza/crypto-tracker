import { NextResponse } from "next/server";

const cache = new Map<string, { time: number; data: unknown }>();
const stale = new Map<string, { time: number; data: unknown }>();
const MAX_CACHE = 200;

function ttlFor(range: "1h" | "all"): number {
  return range === "1h" ? 30 * 1000 : 60 * 60 * 1000;
}

function staleResponse(data: unknown) {
  return NextResponse.json(data, { headers: { "X-Cache-Stale": "1" } });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawSymbol = searchParams.get("symbol") ?? "";
  const rawRange = searchParams.get("range") ?? "";

  if (!/^[A-Za-z0-9]{2,15}$/.test(rawSymbol) || (rawRange !== "1h" && rawRange !== "all")) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const symbol = rawSymbol.toUpperCase();
  const range = rawRange as "1h" | "all";
  const key = `${symbol}-${range}`;
  const ttl = ttlFor(range);

  const cached = cache.get(key);
  if (cached && Date.now() - cached.time < ttl) {
    return NextResponse.json(cached.data);
  }
  const staleEntry = stale.get(key);
  const canUseStale = Boolean(staleEntry);

  const params =
    range === "1h"
      ? `symbol=${symbol}USDT&interval=1m&limit=60`
      : `symbol=${symbol}USDT&interval=1w&limit=1000`;
  const url = `https://data-api.binance.vision/api/v3/klines?${params}`;

  try {
    const res = await fetch(url, { next: { revalidate: range === "1h" ? 30 : 3600 } });

    if (res.status === 400) {
      return NextResponse.json(
        { error: "This coin is not available on Binance" },
        { status: 404 }
      );
    }
    if (res.status === 429 || res.status === 418) {
      return NextResponse.json(
        { error: "Binance rate limit reached, please wait a minute" },
        { status: 429 }
      );
    }
    if (res.status === 451) {
      return NextResponse.json(
        { error: "Binance data is not available from this server location" },
        { status: 502 }
      );
    }
    if (!res.ok) {
      if (canUseStale) return staleResponse(staleEntry!.data);
      return NextResponse.json({ error: "Binance data unavailable" }, { status: 502 });
    }

    const raw = await res.json();
    const candles = Array.isArray(raw)
      ? raw
          .filter((row) => {
            if (!Array.isArray(row) || row.length < 5) return false;
            const [timeMs, open, high, low, close] = row;
            return [timeMs, Number(open), Number(high), Number(low), Number(close)].every(
              (n) => Number.isFinite(n)
            );
          })
          .map((row) => [row[0], Number(row[1]), Number(row[2]), Number(row[3]), Number(row[4])])
      : [];

    if (candles.length < 2) {
      return NextResponse.json({ error: "Not enough data" }, { status: 404 });
    }

    const data = { candles };

    if (!cache.has(key) && cache.size >= MAX_CACHE) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey !== undefined) {
        cache.delete(oldestKey);
        stale.delete(oldestKey);
      }
    }
    cache.set(key, { time: Date.now(), data });
    stale.set(key, { time: Date.now(), data });
    return NextResponse.json(data);
  } catch {
    if (canUseStale) return staleResponse(staleEntry!.data);
    return NextResponse.json({ error: "Binance data unavailable" }, { status: 502 });
  }
}
