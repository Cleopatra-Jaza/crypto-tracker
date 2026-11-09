import { NextResponse } from "next/server";
import { cgFetch } from "@/lib/coingecko";

const TTL = 10 * 60 * 1000;
const MAX_CACHE = 200;
const cache = new Map<string, { time: number; data: unknown }>();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawQuery = searchParams.get("query") ?? "";
  const query = rawQuery.trim();

  if (query.length < 2 || query.length > 50) {
    return NextResponse.json({ coins: [] });
  }

  const key = query.toLowerCase();

  const cached = cache.get(key);
  if (cached && Date.now() - cached.time < TTL) {
    return NextResponse.json(cached.data);
  }

  const STALE_MAX = 60 * 60 * 1000;
  const stale = cache.get(key);
  const canUseStale = stale && Date.now() - stale.time < STALE_MAX;

  try {
    const res = await cgFetch(`/search?query=${encodeURIComponent(query)}`, 600);
    if (!res.ok) {
      if (canUseStale) {
        return NextResponse.json(stale.data);
      }
      if (res.status === 429) {
        return NextResponse.json(
          { error: "CoinGecko rate limit reached, please wait a minute" },
          { status: 429 }
        );
      }
      return NextResponse.json({ error: "Search unavailable" }, { status: 502 });
    }
    const raw = await res.json();
    const items: any[] = Array.isArray(raw?.coins) ? raw.coins : [];
    const coins = items
      .map(
        (entry: any) => entry?.item
      )
      .filter(
        (item): item is { id: string; name: string; symbol: string; thumb: string; market_cap_rank: unknown } =>
          Boolean(item) &&
          typeof item.id === "string" && item.id.length > 0 &&
          typeof item.name === "string" && item.name.length > 0
      )
      .slice(0, 10)
      .map(
        (item: {
          id: string;
          name: string;
          symbol: string;
          thumb: string;
          market_cap_rank: unknown;
        }) => ({
          id: item.id,
          name: item.name,
          symbol: typeof item.symbol === "string" ? item.symbol : "",
          thumb: typeof item.thumb === "string" && item.thumb.startsWith("https://") ? item.thumb : null,
          rank: typeof item.market_cap_rank === "number" && Number.isFinite(item.market_cap_rank) ? item.market_cap_rank : null,
        })
      );
    const data = { coins };
    if (cache.size >= MAX_CACHE) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey !== undefined) {
        cache.delete(oldestKey);
      }
    }
    cache.set(key, { time: Date.now(), data });
    return NextResponse.json(data);
  } catch {
    if (canUseStale) {
      return NextResponse.json(stale.data);
    }
    return NextResponse.json({ error: "Search unavailable" }, { status: 502 });
  }
}
