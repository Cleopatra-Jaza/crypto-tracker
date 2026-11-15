import { NextResponse } from "next/server";
import { isCurrency } from "@/lib/currency";
import { cgFetch } from "@/lib/coingecko";
import { getSharedCache, setSharedCache } from "@/lib/cache";

const TTL = 120 * 1000;
const STALE_MAX = 60 * 60 * 1000;
const SHARED_MAX_AGE_SECONDS = 60 * 60;
const cache = new Map<string, { time: number; data: unknown }>();
const stale = new Map<string, { time: number; data: unknown }>();

function staleResponse(data: unknown) {
  return NextResponse.json(data, { headers: { "X-Cache-Stale": "1" } });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawCurrency = searchParams.get("currency");
  const currency =
    rawCurrency && isCurrency(rawCurrency) ? rawCurrency.toLowerCase() : "usd";

  const cached = cache.get(currency);
  if (cached && Date.now() - cached.time < TTL) {
    return NextResponse.json(cached.data);
  }

  const sharedKey = `coins:markets:${currency}`;
  const shared = await getSharedCache<unknown>(sharedKey);
  if (shared && Date.now() - shared.fetchedAt < TTL) {
    cache.set(currency, { time: shared.fetchedAt, data: shared.data });
    return NextResponse.json(shared.data);
  }

  const staleEntry = stale.get(currency);
  const canUseStale = staleEntry && Date.now() - staleEntry.time < STALE_MAX;

  try {
    const res = await cgFetch(
      `/coins/markets?vs_currency=${currency}&order=market_cap_desc&per_page=50&page=1&price_change_percentage=24h,7d,30d`,
      120
    );
    if (!res.ok) {
      if (canUseStale) return staleResponse(staleEntry!.data);
      if (shared) return staleResponse(shared.data);
      if (res.status === 429) {
        return NextResponse.json(
          { error: "CoinGecko rate limit reached, please wait a minute and try again" },
          { status: 429 }
        );
      }
      return NextResponse.json({ error: "CoinGecko API error" }, { status: res.status });
    }
    const data = await res.json();
    cache.set(currency, { time: Date.now(), data });
    stale.set(currency, { time: Date.now(), data });
    void setSharedCache(sharedKey, data, SHARED_MAX_AGE_SECONDS);
    return NextResponse.json(data);
  } catch {
    if (canUseStale) return staleResponse(staleEntry!.data);
    if (shared) return staleResponse(shared.data);
    return NextResponse.json({ error: "Network error" }, { status: 500 });
  }
}