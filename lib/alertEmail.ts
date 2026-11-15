import { formatMoney } from "@/lib/currency";
import { SITE } from "@/lib/site";

export function evaluateAlert(direction: string, target: number, current: number): boolean {
  if (!Number.isFinite(target) || !Number.isFinite(current)) {
    return false;
  }
  if (direction === "above") {
    return current >= target;
  }
  if (direction === "below") {
    return current <= target;
  }
  return false;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildAlertEmail(input: {
  coinName: string;
  coinId: string;
  direction: "above" | "below" | string;
  targetPrice: number;
  currentPrice: number;
}): { subject: string; text: string; html: string } {
  const safeCoinName = input.coinName.replace(/[\r\n]+/g, " ").slice(0, 60);
  const action = input.direction === "below" ? "dropped below" : "went above";
  const targetFormatted = formatMoney(input.targetPrice, "usd");
  const currentFormatted = formatMoney(input.currentPrice, "usd");
  const subject = `${safeCoinName} ${action} ${targetFormatted}`;

  const coinUrl = `${SITE.url}/coin/${encodeURIComponent(input.coinId)}`;
  const sentence = `${safeCoinName} ${action} ${targetFormatted}. Current price: ${currentFormatted}.`;
  const note = `You are receiving this because you set a price alert with the email option on Crypto Tracker (${SITE.url}/alerts). The alert is now finished; open the alerts page to delete it or to create a new one. If this message landed in spam, please mark it as not spam.`;

  const text = `${sentence}\n${coinUrl}\n${note}`;

  const html = `<div><h1>${escapeHtml(subject)}</h1><p>${escapeHtml(sentence)}</p><p><a href="${escapeHtml(coinUrl)}">${escapeHtml(coinUrl)}</a></p><p>${escapeHtml(note)}</p></div>`;

  return { subject, text, html };
}

export function isAlertDue(
  alert: { triggeredAt: Date | null; direction: string; targetPrice: number },
  currentPrice: number
): boolean {
  if (alert.triggeredAt !== null) {
    return true;
  }
  return evaluateAlert(alert.direction, alert.targetPrice, currentPrice);
}

export function chunk<T>(items: T[], size: number): T[][] {
  if (size < 1) {
    return [];
  }
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}
