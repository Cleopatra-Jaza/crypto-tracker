import { NextResponse } from "next/server";
import { isCurrency } from "@/lib/currency";
import { cgFetch } from "@/lib/coingecko";

const TTL = 600 * 1000;
const STALE_MAX = 60 * 60 * 1000;
const cache = new Map<string, { time: number; data: unknown }>();
const stale = new Map<string, { time: number; data: unknown }>();

function num(x: unknown): number | null {
  if (typeof x === "number") return Number.isFinite(x) ? x : null;
  if (typeof x === "string" && x.trim() !== "") {
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function staleResponse(data: unknown) {
  return NextResponse.json(data, { headers: { "X-Cache-Stale": "1" } });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const rawCurrency = searchParams.get("currency");
  const currency =
    rawCurrency && isCurrency(rawCurrency) ? rawCurrency.toLowerCase() : "usd";
  const key = `${id}-${currency}`;

  const cached = cache.get(key);
  if (cached && Date.now() - cached.time < TTL) {
    return NextResponse.json(cached.data);
  }
  const staleEntry = stale.get(key);
  const canUseStale = staleEntry && Date.now() - staleEntry.time < STALE_MAX;

  try {
    const res = await cgFetch(
      `/coins/${encodeURIComponent(id)}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`,
      600
    );
    if (!res.ok) {
      if (canUseStale) return staleResponse(staleEntry!.data);
      if (res.status === 429) {
        return NextResponse.json(
          { error: "CoinGecko rate limit reached, please wait a minute and try again" },
          { status: 429 }
        );
      }
      return NextResponse.json({ error: "CoinGecko API error" }, { status: res.status });
    }
    const raw = await res.json();
    const marketData = raw.market_data || {};
    const image = raw.image || {};
    const description = raw.description || {};
    const links = raw.links || {};
    const cur = (field: string) =>
      num(marketData[field]?.[currency] ?? marketData[field] ?? null);
    const data = {
      name: raw.name ?? null,
      symbol: raw.symbol ?? null,
      image: image.large ?? null,
      rank: num(marketData.market_cap_rank),
      description: typeof description.en === "string" ? description.en : null,
      homepage:
        Array.isArray(links.homepage) && links.homepage[0] &&
        /^https?:\/\//i.test(links.homepage[0])
          ? links.homepage[0]
          : null,
      price: cur("current_price"),
      marketCap: cur("market_cap"),
      volume: cur("total_volume"),
      high24h: cur("high_24h"),
      low24h: cur("low_24h"),
      ath: cur("ath"),
      athDate:
        typeof marketData.ath_date === "object" && marketData.ath_date != null
          ? String(marketData.ath_date[currency] ?? marketData.ath_date ?? null)
          : null,
      atl: cur("atl"),
      atlDate:
        typeof marketData.atl_date === "object" && marketData.atl_date != null
          ? String(marketData.atl_date[currency] ?? marketData.atl_date ?? null)
          : null,
      change24h: cur("price_change_percentage_24h_in_currency"),
      change7d: cur("price_change_percentage_7d_in_currency"),
      change30d: cur("price_change_percentage_30d_in_currency"),
      change1y: cur("price_change_percentage_1y_in_currency"),
      circulatingSupply: cur("circulating_supply"),
      totalSupply: cur("total_supply"),
      maxSupply: cur("max_supply"),
    };
    cache.set(key, { time: Date.now(), data });
    stale.set(key, { time: Date.now(), data });
    return NextResponse.json(data);
  } catch {
    if (canUseStale) return staleResponse(staleEntry!.data);
    return NextResponse.json({ error: "Network error" }, { status: 500 });
  }
}
