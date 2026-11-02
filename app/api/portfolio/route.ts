import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const holdings = await db.holding.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      holdings.map((h) => ({
        id: h.id,
        coinId: h.coinId,
        amount: Number(h.amount),
        buyPrice: Number(h.buyPrice),
        createdAt: h.createdAt,
        userId: h.userId,
      }))
    );
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

  const { coinId, amount, buyPrice } = (body ?? {}) as {
    coinId?: unknown;
    amount?: unknown;
    buyPrice?: unknown;
  };

  if (typeof coinId !== "string" || coinId.length === 0 || coinId.length > 100) {
    return NextResponse.json(
      { error: "coinId must be a non-empty string of at most 100 characters" },
      { status: 400 }
    );
  }
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "amount must be a finite number greater than 0" },
      { status: 400 }
    );
  }
  if (
    typeof buyPrice !== "number" ||
    !Number.isFinite(buyPrice) ||
    buyPrice < 0
  ) {
    return NextResponse.json(
      { error: "buyPrice must be a finite number greater than or equal to 0" },
      { status: 400 }
    );
  }

  try {
    const count = await db.holding.count({
      where: { userId: session.user.id },
    });
    if (count >= 100) {
      return NextResponse.json(
        { error: "Maximum of 100 holdings reached" },
        { status: 400 }
      );
    }

    const holding = await db.holding.create({
      data: {
        userId: session.user.id,
        coinId,
        amount,
        buyPrice,
      },
    });

    return NextResponse.json(
      {
        id: holding.id,
        coinId: holding.coinId,
        amount: Number(holding.amount),
        buyPrice: Number(holding.buyPrice),
        createdAt: holding.createdAt,
        userId: holding.userId,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
