import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cgFetch } from "@/lib/coingecko";
import { sendEmail } from "@/lib/email";
import { buildAlertEmail, chunk, isAlertDue } from "@/lib/alertEmail";
import { isAuthorized } from "@/lib/cronAuth";

async function handler(request: Request) {
  const start = Date.now();
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret || secret.trim().length < 16) {
      return NextResponse.json({ error: "Not configured" }, { status: 503 });
    }
    if (!isAuthorized(request.headers.get("authorization"), secret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const startOfUtcDay = new Date();
    startOfUtcDay.setUTCHours(0, 0, 0, 0);
    const dailyCount = await db.alert.count({
      where: { emailedAt: { not: null, gte: startOfUtcDay } },
    });
    if (dailyCount >= 250) {
      return NextResponse.json({ sent: 0, reason: "daily limit" }, { status: 200 });
    }

    const candidates = await db.alert.findMany({
      where: { notifyEmail: true, emailedAt: null },
      orderBy: { createdAt: "asc" },
      take: 100,
      select: {
        id: true,
        coinId: true,
        coinName: true,
        targetPrice: true,
        direction: true,
        triggeredAt: true,
        user: { select: { email: true } },
      },
    });

    if (candidates.length === 0) {
      return NextResponse.json({ checked: 0, due: 0, sent: 0, failed: 0 }, { status: 200 });
    }

    const validCoinId = /^[a-z0-9-]+$/;
    const uniqueCoinIds = Array.from(
      new Set(
        candidates
          .map((c) => c.coinId)
          .filter((id) => validCoinId.test(id) && id.length <= 100)
      )
    );
    const groups = chunk(uniqueCoinIds, 50).slice(0, 2);
    const priceMap: Record<string, number> = {};

    for (const group of groups) {
      if (group.length === 0) continue;
      try {
        const res = await cgFetch(
          `/simple/price?ids=${group.map(encodeURIComponent).join(",")}&vs_currencies=usd`,
          60
        );
        if (!res.ok) {
          return NextResponse.json({ error: "Price check unavailable" }, { status: 502 });
        }
        const data = (await res.json()) as Record<string, { usd?: number }>;
        if (data && typeof data === "object") {
          for (const [id, value] of Object.entries(data)) {
            const usd = value?.usd;
            if (typeof usd === "number" && Number.isFinite(usd)) {
              priceMap[id] = usd;
            }
          }
        }
      } catch {
        return NextResponse.json({ error: "Price check unavailable" }, { status: 502 });
      }
    }

    let checked = 0;
    let due = 0;
    let sent = 0;
    let failed = 0;
    let skipped = 0;
    let attempted = 0;
    let dailySentThisRun = 0;

    for (const alert of candidates) {
      checked++;
      const email = alert.user?.email;
      if (typeof email !== "string" || email.trim().length === 0) {
        skipped++;
        continue;
      }

      const currentPrice = priceMap[alert.coinId];
      if (typeof currentPrice !== "number") {
        skipped++;
        continue;
      }

      const targetPrice = Number(alert.targetPrice);
      if (
        !isAlertDue(
          { triggeredAt: alert.triggeredAt, direction: alert.direction, targetPrice },
          currentPrice
        )
      ) {
        continue;
      }

      due++;

      if (attempted >= 25) break;
      if (dailyCount + dailySentThisRun >= 250) break;
      if (Date.now() - start > 20000) break;

      attempted++;

      try {
        const claimTime = new Date();
        const claim = await db.alert.updateMany({
          where: { id: alert.id, emailedAt: null },
          data: { emailedAt: claimTime, triggeredAt: alert.triggeredAt ?? claimTime },
        });
        if (claim.count !== 1) {
          continue;
        }

        const emailContent = buildAlertEmail({
          coinName: alert.coinName,
          coinId: alert.coinId,
          direction: alert.direction,
          targetPrice,
          currentPrice,
        });
        const result = await sendEmail({ to: email, ...emailContent });

        if (result.ok) {
          sent++;
          dailySentThisRun++;
        } else if (result.status === 0 || result.status === 429 || result.status >= 500) {
          failed++;
          await db.alert.updateMany({
            where: { id: alert.id, emailedAt: claimTime },
            data: { emailedAt: null },
          });
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    console.log("[cron-alerts]", { checked, due, sent, failed, skipped });
    return NextResponse.json({ checked, due, sent, failed, skipped }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export const GET = handler;
export const POST = handler;
