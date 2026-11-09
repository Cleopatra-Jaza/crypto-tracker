import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

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

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const alerts = await db.alert.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ alerts: alerts.map(serialize) });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { coinId, coinName, targetPrice, direction } = (body ?? {}) as {
    coinId?: unknown;
    coinName?: unknown;
    targetPrice?: unknown;
    direction?: unknown;
  };

  if (typeof coinId !== "string" || coinId.length === 0 || coinId.length > 100 || !/^[a-z0-9-]+$/.test(coinId)) {
    return NextResponse.json(
      { error: "coinId must match /^[a-z0-9-]+$/ and be at most 100 characters" },
      { status: 400 }
    );
  }
  if (typeof coinName !== "string" || coinName.trim().length === 0 || coinName.length > 100) {
    return NextResponse.json(
      { error: "coinName must be a non-empty string of at most 100 characters" },
      { status: 400 }
    );
  }
  if (typeof targetPrice !== "number" || !Number.isFinite(targetPrice) || targetPrice <= 0 || targetPrice >= 1e12) {
    return NextResponse.json(
      { error: "targetPrice must be a finite number greater than 0 and less than 1e12" },
      { status: 400 }
    );
  }
  if (direction !== "above" && direction !== "below") {
    return NextResponse.json(
      { error: 'direction must be exactly "above" or "below"' },
      { status: 400 }
    );
  }

  try {
    const activeCount = await db.alert.count({
      where: { userId: session.user.id, triggeredAt: null },
    });
    if (activeCount >= 20) {
      return NextResponse.json({ error: "Maximum 20 active alerts" }, { status: 400 });
    }
    const alert = await db.alert.create({
      data: {
        userId: session.user.id,
        coinId,
        coinName,
        targetPrice,
        direction,
      },
    });
    return NextResponse.json(serialize(alert), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
