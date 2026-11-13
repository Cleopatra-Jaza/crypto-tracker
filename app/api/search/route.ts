import { NextResponse } from "next/server";
import { cgFetch } from "@/lib/coingecko";

const TTL = 10 * 60 * 1000;
const MAX_CACHE = 200;
const cache = new Map<string, { time: number; data: unknown }>();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawQuery = searchParams.get("query") ?? "";
  const query = rawQuery.trim();

  if (query.length < 2 || query.length > 50) {
    return NextResponse.json({ coins: [] });
  }

  const key = query.toLowerCase();

  const cached = cache.get(key);
  if (cached && Date.now() - cached.time < TTL) {
    return NextResponse.json(cached.data);
  }

  const STALE_MAX = 60 * 60 * 1000;
  const stale = cache.get(key);
  const canUseStale = stale && Date.now() - stale.time < STALE_MAX;

  try {
    const res = await cgFetch(`/search?query=${encodeURIComponent(query)}`, 600);
    console.log("[search]", "query:", query, "status:", res.status);
    if (!res.ok) {
      if (canUseStale) {
        return NextResponse.json(stale.data);
      }
      if (res.status === 429) {
        return NextResponse.json(
          { error: "CoinGecko rate limit reached, please wait a minute" },
          { status: 429 }
        );
      }
      return NextResponse.json({ error: "Search unavailable" }, { status: 502 });
    }
    const raw: unknown = await res.json();
    const items: unknown[] =
      raw !== null && typeof raw === "object" && Array.isArray((raw as { coins?: unknown }).coins)
        ? (raw as { coins: unknown[] }).coins
        : [];
    const firstItem = items[0];
    const firstRecord =
      firstItem !== null && typeof firstItem === "object" ? (firstItem as Record<string, unknown>) : null;
    const firstNested =
      firstRecord?.item !== null && typeof firstRecord?.item === "object"
        ? (firstRecord.item as Record<string, unknown>)
        : null;
    console.log(
      "[search]",
      "keys:",
      raw && typeof raw === "object" ? Object.keys(raw) : [],
      "coins.length:",
      items.length,
      "firstId:",
      (firstRecord?.id ?? firstNested?.id ?? null) as string | null
    );
    const coins = items
      .map((entry) => {
        if (entry !== null && typeof entry === "object") {
          const rec = entry as Record<string, unknown>;
          return rec.item !== undefined ? rec.item : entry;
        }
        return entry;
      })
      .filter((item): item is Record<string, unknown> => {
        if (item === null || typeof item !== "object") return false;
        const rec = item as Record<string, unknown>;
        return (
          typeof rec.id === "string" &&
          rec.id.length > 0 &&
          typeof rec.name === "string" &&
          rec.name.length > 0
        );
      })
      .slice(0, 10)
      .map((item) => ({
        id: item.id as string,
        name: item.name as string,
        symbol: typeof item.symbol === "string" ? item.symbol : "",
        thumb:
          typeof item.thumb === "string" && item.thumb.startsWith("https://")
            ? item.thumb
            : null,
        rank:
          typeof item.market_cap_rank === "number" && Number.isFinite(item.market_cap_rank)
            ? item.market_cap_rank
            : null,
      }));
    const data = { coins };
    if (coins.length > 0) {
      if (cache.size >= MAX_CACHE) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey !== undefined) {
          cache.delete(oldestKey);
        }
      }
      cache.set(key, { time: Date.now(), data });
    }
    if (coins.length === 0 && canUseStale) {
      return NextResponse.json(stale.data);
    }
    return NextResponse.json(data);
  } catch {
    if (canUseStale) {
      return NextResponse.json(stale.data);
    }
    return NextResponse.json({ error: "Search unavailable" }, { status: 502 });
  }
}
