import { NextResponse } from "next/server";
import { isCurrency } from "@/lib/currency";

const BASE =
  "https://api.coingecko.com/api/v3/coins/markets?order=market_cap_desc&per_page=50&page=1&price_change_percentage=24h,7d,30d";

const TTL = 60 * 1000;
const cache = new Map<string, { time: number; data: unknown }>();

function buildURL(currency: string) {
  return `${BASE}&vs_currency=${currency}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawCurrency = searchParams.get("currency");
  const currency = rawCurrency && isCurrency(rawCurrency)
    ? rawCurrency.toLowerCase()
    : "usd";

  const cached = cache.get(currency);
  if (cached && Date.now() - cached.time < TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    const res = await fetch(buildURL(currency), { cache: "no-store" });
    if (!res.ok) {
      if (cached) return NextResponse.json(cached.data);
      return NextResponse.json(
        { error: "CoinGecko API error" },
        { status: res.status }
      );
    }
    const data = await res.json();
    cache.set(currency, { time: Date.now(), data });
    return NextResponse.json(data);
  } catch {
    if (cached) return NextResponse.json(cached.data);
    return NextResponse.json({ error: "Network error" }, { status: 500 });
  }
}