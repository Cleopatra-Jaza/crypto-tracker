import { NextResponse } from "next/server";
import { isCurrency } from "@/lib/currency";
import { cgFetch } from "@/lib/coingecko";

const STALE_MAX = 60 * 60 * 1000;
const cache = new Map<string, { time: number; data: unknown }>();
const stale = new Map<string, { time: number; data: unknown }>();
const ALLOWED_DAYS = ["1", "7", "30", "90", "365"];

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
  const rawDays = searchParams.get("days") ?? "7";
  const days = ALLOWED_DAYS.includes(rawDays) ? rawDays : "7";
  const rawCurrency = searchParams.get("currency");
  const currency =
    rawCurrency && isCurrency(rawCurrency) ? rawCurrency.toLowerCase() : "usd";
  const key = `${id}-${days}-${currency}`;
  const ttl = revalidateFor(days) * 1000;

  const cached = cache.get(key);
  if (cached && Date.now() - cached.time < ttl) {
    return NextResponse.json(cached.data);
  }
  const staleEntry = stale.get(key);
  const canUseStale = staleEntry && Date.now() - staleEntry.time < STALE_MAX;

  try {
    const res = await cgFetch(
      `/coins/${encodeURIComponent(id)}/ohlc?vs_currency=${currency}&days=${days}`,
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
    const candles = Array.isArray(raw)
      ? raw.filter((row) => {
          if (!Array.isArray(row) || row.length < 5) return false;
          const [timeMs, open, high, low, close] = row;
          return (
            Number.isFinite(timeMs) &&
            Number.isFinite(open) &&
            Number.isFinite(high) &&
            Number.isFinite(low) &&
            Number.isFinite(close)
          );
        }).map((row) => [row[0], row[1], row[2], row[3], row[4]])
      : [];
    const data = { candles };
    cache.set(key, { time: Date.now(), data });
    stale.set(key, { time: Date.now(), data });
    return NextResponse.json(data);
  } catch {
    if (canUseStale) return staleResponse(staleEntry!.data);
    return NextResponse.json({ error: "Network error" }, { status: 500 });
  }
}
