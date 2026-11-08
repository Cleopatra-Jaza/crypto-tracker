import { NextResponse } from "next/server";
import { cgFetch } from "@/lib/coingecko";

const TTL = 600 * 1000;
const STALE_MAX = 60 * 60 * 1000;
let cache: { time: number; data: unknown } | null = null;
let stale: { time: number; data: unknown } | null = null;

function staleResponse(data: unknown) {
  return NextResponse.json(data, { headers: { "X-Cache-Stale": "1" } });
}

export async function GET() {
  if (cache && Date.now() - cache.time < TTL) {
    return NextResponse.json(cache.data);
  }
  const canUseStale = stale && Date.now() - stale.time < STALE_MAX;
  try {
    const res = await cgFetch("/search/trending", 600);
    if (!res.ok) {
      if (canUseStale) return staleResponse(stale!.data);
      if (res.status === 429) {
        return NextResponse.json(
          { error: "CoinGecko rate limit reached, please wait a minute and try again" },
          { status: 429 }
        );
      }
      return NextResponse.json({ error: "CoinGecko API error" }, { status: res.status });
    }
    const raw = await res.json();
    const items = Array.isArray(raw?.coins) ? raw.coins : [];
    type RawItem = { id?: unknown; name?: unknown; symbol?: unknown; thumb?: unknown; market_cap_rank?: unknown };
    const coins = items
      .map((entry: { item?: RawItem }) => entry?.item)
      .filter((item: RawItem | undefined): item is { id: string; name: string; symbol: string; thumb: string; market_cap_rank: unknown } =>
        Boolean(item) &&
        typeof item!.id === "string" && item!.id.length > 0 &&
        typeof item!.name === "string" && item!.name.length > 0
      )
      .slice(0, 7)
      .map((item: { id: string; name: string; symbol: string; thumb: string; market_cap_rank: unknown }) => ({
        id: item.id,
        name: item.name,
        symbol: typeof item.symbol === "string" ? item.symbol : "",
        thumb: typeof item.thumb === "string" ? item.thumb : "",
        rank: typeof item.market_cap_rank === "number" && Number.isFinite(item.market_cap_rank) ? item.market_cap_rank : null,
      }));
    const data = { coins };
    cache = { time: Date.now(), data };
    stale = { time: Date.now(), data };
    return NextResponse.json(data);
  } catch {
    if (canUseStale) return staleResponse(stale!.data);
    return NextResponse.json({ error: "Network error" }, { status: 500 });
  }
}
