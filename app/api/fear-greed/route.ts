import { NextResponse } from "next/server";

const TTL = 60 * 60 * 1000;
let cache: { time: number; data: unknown } | null = null;
let stale: { time: number; data: unknown } | null = null;

export async function GET() {
  if (cache && Date.now() - cache.time < TTL) {
    return NextResponse.json(cache.data);
  }
  try {
    const res = await fetch("https://api.alternative.me/fng/?limit=1", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      if (stale) return NextResponse.json(stale.data);
      return NextResponse.json({ error: "Fear & Greed unavailable" }, { status: 502 });
    }
    const raw = await res.json();
    const item = raw?.data?.[0];
    const value = Number(item?.value);
    const classification = typeof item?.value_classification === "string" ? item.value_classification : "";
    const timestamp = Number(item?.timestamp);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      if (stale) return NextResponse.json(stale.data);
      return NextResponse.json({ error: "Fear & Greed unavailable" }, { status: 502 });
    }
    const data = { value, classification, timestamp: Number.isFinite(timestamp) ? timestamp : Date.now() };
    cache = { time: Date.now(), data };
    stale = { time: Date.now(), data };
    return NextResponse.json(data);
  } catch {
    if (stale) return NextResponse.json(stale.data);
    return NextResponse.json({ error: "Fear & Greed unavailable" }, { status: 502 });
  }
}
