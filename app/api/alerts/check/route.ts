import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { cgFetch } from "@/lib/coingecko";

let priceCache: { time: number; key: string; data: Record<string, { usd?: number }> } | null = null;
let priceStale: { time: number; key: string; data: Record<string, { usd?: number }> } | null = null;
const PRICE_TTL = 60 * 1000;
const STALE_MAX = 60 * 60 * 1000;

function serialize(a: {
  id: string;
  coinId: string;
  coinName: string;
  targetPrice: unknown;
  direction: string;
  triggeredAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: a.id,
    coinId: a.coinId,
    coinName: a.coinName,
    targetPrice: Number(a.targetPrice),
    direction: a.direction,
    triggeredAt: a.triggeredAt ? a.triggeredAt.toISOString() : null,
    createdAt: a.createdAt.toISOString(),
  };
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const alerts = await db.alert.findMany({
      where: { userId: session.user.id, triggeredAt: null },
      orderBy: { createdAt: "asc" },
    });
    if (alerts.length === 0) {
      return NextResponse.json({ triggered: [] });
    }

    const uniqueIds = Array.from(new Set(alerts.map((a) => a.coinId))).slice(0, 20);
    const key = uniqueIds.slice().sort().join(",");
    let prices: Record<string, { usd?: number }> | null = null;

    if (priceCache && priceCache.key === key && Date.now() - priceCache.time < PRICE_TTL) {
      prices = priceCache.data;
    } else {
      try {
        const res = await cgFetch(
          `/simple/price?ids=${uniqueIds.map(encodeURIComponent).join(",")}&vs_currencies=usd`,
          60
        );
        if (!res.ok) {
          if (priceStale && priceStale.key === key && Date.now() - priceStale.time < STALE_MAX) {
            prices = priceStale.data;
          } else {
            return NextResponse.json({ error: "Price check unavailable" }, { status: 502 });
          }
        } else {
          const data = (await res.json()) as Record<string, { usd?: number }>;
          prices = data && typeof data === "object" ? data : {};
          priceCache = { time: Date.now(), key, data: prices };
          priceStale = { time: Date.now(), key, data: prices };
        }
      } catch {
        if (priceStale && priceStale.key === key && Date.now() - priceStale.time < STALE_MAX) {
          prices = priceStale.data;
        } else {
          return NextResponse.json({ error: "Price check unavailable" }, { status: 502 });
        }
      }
    }

    const triggered: ReturnType<typeof serialize>[] = [];
    for (const alert of alerts) {
      const current = prices?.[alert.coinId]?.usd;
      if (typeof current !== "number" || !Number.isFinite(current)) continue;
      const target = Number(alert.targetPrice);
      const hit =
        (alert.direction === "above" && current >= target) ||
        (alert.direction === "below" && current <= target);
      if (hit) {
        const updated = await db.alert.update({
          where: { id: alert.id },
          data: { triggeredAt: new Date() },
        });
        triggered.push(serialize(updated));
      }
    }
    return NextResponse.json({ triggered });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
