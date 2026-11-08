import { NextResponse } from "next/server";
import { isCurrency } from "@/lib/currency";

const cache = new Map<string, { time: number; data: unknown }>();
const TTL = 60 * 1000;
const ALLOWED_DAYS = ["1", "7", "30", "90", "365"];

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const rawDays = searchParams.get("days") ?? "7";
  const days = ALLOWED_DAYS.includes(rawDays) ? rawDays : "7";
  const rawCurrency = searchParams.get("currency");
  const currency = rawCurrency && isCurrency(rawCurrency)
    ? rawCurrency.toLowerCase()
    : "usd";
  const key = `${id}-${days}-${currency}`;

  const cached = cache.get(key);
  if (cached && Date.now() - cached.time < TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}/ohlc?vs_currency=${currency}&days=${days}`,
      { cache: "no-store" }
    );
    if (!res.ok) {
      if (cached) return NextResponse.json(cached.data);
      return NextResponse.json(
        { error: "CoinGecko API error" },
        { status: res.status }
      );
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
    return NextResponse.json(data);
  } catch {
    if (cached) return NextResponse.json(cached.data);
    return NextResponse.json({ error: "Network error" }, { status: 500 });
  }
}