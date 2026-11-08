import { NextResponse } from "next/server";
import { isCurrency } from "@/lib/currency";

const cache = new Map<string, { time: number; data: unknown }>();
const TTL = 5 * 60 * 1000;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const rawCurrency = searchParams.get("currency");
  const currency = rawCurrency && isCurrency(rawCurrency)
    ? rawCurrency.toLowerCase()
    : "usd";
  const key = `${id}-${currency}`;

  const cached = cache.get(key);
  if (cached && Date.now() - cached.time < TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`,
      { cache: "no-store" }
    );
    if (!res.ok) {
      if (cached) return NextResponse.json(cached.data);
      return NextResponse.json({ error: "CoinGecko API error" }, { status: res.status });
    }
    const raw = await res.json();
    const marketData = raw.market_data || {};
    const image = raw.image || {};
    const description = raw.description || {};
    const links = raw.links || {};
    const data = {
      name: raw.name ?? null,
      symbol: raw.symbol ?? null,
      image: image.large ?? null,
      rank: marketData.market_cap_rank ?? null,
      description: typeof description.en === "string" ? description.en : null,
      homepage:
        Array.isArray(links.homepage) && links.homepage[0] &&
        /^https?:\/\//i.test(links.homepage[0])
          ? links.homepage[0]
          : null,
      price: marketData.current_price?.[currency] ?? null,
      marketCap: marketData.market_cap?.[currency] ?? null,
      volume: marketData.total_volume?.[currency] ?? null,
      high24h: marketData.high_24h?.[currency] ?? null,
      low24h: marketData.low_24h?.[currency] ?? null,
      ath: marketData.ath?.[currency] ?? null,
      athDate: marketData.ath_date?.[currency] ?? null,
      atl: marketData.atl?.[currency] ?? null,
      atlDate: marketData.atl_date?.[currency] ?? null,
      change24h: marketData.price_change_percentage_24h_in_currency ?? null,
      change7d: marketData.price_change_percentage_7d_in_currency ?? null,
      change30d: marketData.price_change_percentage_30d_in_currency ?? null,
      change1y: marketData.price_change_percentage_1y_in_currency ?? null,
      circulatingSupply: marketData.circulating_supply ?? null,
      totalSupply: marketData.total_supply ?? null,
      maxSupply: marketData.max_supply ?? null,
    };
    cache.set(key, { time: Date.now(), data });
    return NextResponse.json(data);
  } catch {
    if (cached) return NextResponse.json(cached.data);
    return NextResponse.json({ error: "Network error" }, { status: 500 });
  }
}
