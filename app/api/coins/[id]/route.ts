import { NextResponse } from "next/server";

const cache = new Map<string, { time: number; data: unknown }>();
const TTL = 60 * 1000; // 60 seconds

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const days = new URL(req.url).searchParams.get("days") ?? "7";
  const key = `${id}-${days}`;

  const cached = cache.get(key);
  if (cached && Date.now() - cached.time < TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${days}`,
      { cache: "no-store" }
    );
    if (!res.ok) {
      // Error vandha, pazhaya data irundha adhaye tharum
      if (cached) return NextResponse.json(cached.data);
      return NextResponse.json(
        { error: "CoinGecko API error" },
        { status: res.status }
      );
    }
    const raw = await res.json();
    const data = { prices: raw.prices };
    cache.set(key, { time: Date.now(), data });
    return NextResponse.json(data);
  } catch {
    if (cached) return NextResponse.json(cached.data);
    return NextResponse.json({ error: "Network error" }, { status: 500 });
  }
}