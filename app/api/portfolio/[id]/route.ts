import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const result = await db.holding.deleteMany({
      where: { id, userId: session.user.id },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { amount, buyPrice } = body as { amount?: unknown; buyPrice?: unknown };

    const validAmount =
      typeof amount === "number" && Number.isFinite(amount) && amount > 0 && amount < 1e15;
    const validBuyPrice =
      typeof buyPrice === "number" &&
      Number.isFinite(buyPrice) &&
      buyPrice >= 0 &&
      buyPrice < 1e12;

    if (!validAmount || !validBuyPrice) {
      return NextResponse.json(
        {
          error:
            "Invalid amount or buy price (amount must be > 0 and < 1e15, buy price must be >= 0 and < 1e12)",
        },
        { status: 400 }
      );
    }

    const result = await db.holding.updateMany({
      where: { id, userId: session.user.id },
      data: { amount, buyPrice },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
