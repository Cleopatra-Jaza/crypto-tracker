import { NextResponse } from "next/server";
import { isCurrency } from "@/lib/currency";
import { cgFetch } from "@/lib/coingecko";

const STALE_MAX = 60 * 60 * 1000;
const cache = new Map<string, { time: number; data: unknown }>();
const stale = new Map<string, { time: number; data: unknown }>();

function revalidateFor(days: string): number {
  if (days === "1") return 120;
  if (days === "7") return 300;
  return 900;
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
  const days = searchParams.get("days") ?? "7";
  const rawCurrency = searchParams.get("currency");
  const currency =
    rawCurrency && isCurrency(rawCurrency) ? rawCurrency.toLowerCase() : "usd";
  const key = `${currency}-${id}-${days}`;
  const ttl = revalidateFor(days) * 1000;

  const cached = cache.get(key);
  if (cached && Date.now() - cached.time < ttl) {
    return NextResponse.json(cached.data);
  }
  const staleEntry = stale.get(key);
  const canUseStale = staleEntry && Date.now() - staleEntry.time < STALE_MAX;

  try {
    const res = await cgFetch(
      `/coins/${encodeURIComponent(id)}/market_chart?vs_currency=${currency}&days=${encodeURIComponent(days)}`,
      revalidateFor(days)
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
    const data = { prices: raw.prices };
    cache.set(key, { time: Date.now(), data });
    stale.set(key, { time: Date.now(), data });
    return NextResponse.json(data);
  } catch {
    if (canUseStale) return staleResponse(staleEntry!.data);
    return NextResponse.json({ error: "Network error" }, { status: 500 });
  }
}
