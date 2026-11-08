import { NextResponse } from "next/server";

const URL =
  "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&price_change_percentage=24h,7d,30d";

let cache: { time: number; data: unknown } | null = null;
const TTL = 60 * 1000;

export async function GET() {
  if (cache && Date.now() - cache.time < TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    const res = await fetch(URL, { cache: "no-store" });
    if (!res.ok) {
      if (cache) return NextResponse.json(cache.data);
      return NextResponse.json(
        { error: "CoinGecko API error" },
        { status: res.status }
      );
    }
    const data = await res.json();
    cache = { time: Date.now(), data };
    return NextResponse.json(data);
  } catch {
    if (cache) return NextResponse.json(cache.data);
    return NextResponse.json({ error: "Network error" }, { status: 500 });
  }
}