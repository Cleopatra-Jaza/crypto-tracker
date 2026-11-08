import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id as string;

  try {
    const items = await db.watchlistItem.findMany({
      where: { userId: userId },
      orderBy: { createdAt: "asc" },
      select: { coinId: true },
    });
    return NextResponse.json({ coinIds: items.map((i) => i.coinId) });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id as string;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const obj = body as { coinId?: unknown; coinIds?: unknown };
  let coinIds: string[] = [];

  if (Array.isArray(obj?.coinIds)) {
    coinIds = obj.coinIds as string[];
  } else if (typeof obj?.coinId === "string") {
    coinIds = [obj.coinId];
  } else {
    return NextResponse.json(
      { error: "Provide coinId (string) or coinIds (string[])" },
      { status: 400 }
    );
  }

  if (coinIds.length > 100) {
    return NextResponse.json(
      { error: "coinIds must have at most 100 entries" },
      { status: 400 }
    );
  }

  for (const c of coinIds) {
    if (typeof c !== "string" || c.length === 0 || c.length > 100) {
      return NextResponse.json(
        { error: "Each coinId must be a non-empty string of at most 100 characters" },
        { status: 400 }
      );
    }
  }

  try {
    const existing = await db.watchlistItem.findMany({
      where: { userId: userId },
      select: { coinId: true },
    });
    const existingSet = new Set(existing.map((e) => e.coinId));
    const newDistinct = new Set(
      coinIds.filter((c) => !existingSet.has(c))
    ).size;

    if (existingSet.size + newDistinct > 200) {
      return NextResponse.json(
        { error: "Watchlist cannot exceed 200 items" },
        { status: 400 }
      );
    }

    await db.watchlistItem.createMany({
      data: coinIds.map((coinId) => ({
        userId: userId,
        coinId,
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}