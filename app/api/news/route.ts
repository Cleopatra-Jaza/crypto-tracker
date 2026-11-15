import { NextResponse } from "next/server";
import { parseRssItems, type NewsItem } from "@/lib/news";

const TTL = 600 * 1000;
const STALE_MAX = 60 * 60 * 1000;
const FEED_TIMEOUT_MS = 5000;
const USER_AGENT = "crypto-tracker-portfolio-project";
const MAX_ITEMS = 30;

// Fixed feed URLs: never take a URL from the request.
const FEEDS: { source: string; url: string }[] = [
  { source: "Cointelegraph", url: "https://cointelegraph.com/rss" },
  {
    source: "CoinDesk",
    url: "https://www.coindesk.com/arc/outboundfeeds/rss/?outputType=xml",
  },
];

let cache: { time: number; data: unknown } | null = null;
let stale: { time: number; data: unknown } | null = null;

function staleResponse(data: unknown) {
  return NextResponse.json(data, { headers: { "X-Cache-Stale": "1" } });
}

async function fetchFeed(feed: { source: string; url: string }): Promise<NewsItem[]> {
  const res = await fetch(feed.url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${feed.source} feed failed: ${res.status}`);
  const xml = await res.text();
  return parseRssItems(xml, feed.source);
}

export async function GET() {
  if (cache && Date.now() - cache.time < TTL) {
    return NextResponse.json(cache.data);
  }
  const canUseStale = stale && Date.now() - stale.time < STALE_MAX;

  let results: PromiseSettledResult<NewsItem[]>[];
  try {
    results = await Promise.allSettled(
      FEEDS.map((feed) => fetchFeed(feed))
    );
  } catch {
    if (canUseStale) return staleResponse(stale!.data);
    return NextResponse.json({ items: [], error: "Network error" });
  }

  const collected: NewsItem[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") collected.push(...result.value);
  }

  if (collected.length === 0) {
    if (canUseStale) return staleResponse(stale!.data);
    return NextResponse.json({
      items: [],
      error: "News feeds are currently unavailable",
    });
  }

  const seenLinks = new Set<string>();
  const unique = collected.filter((item) => {
    if (seenLinks.has(item.link)) return false;
    seenLinks.add(item.link);
    return true;
  });

  unique.sort((a, b) => {
    if (a.publishedAt === null && b.publishedAt === null) return 0;
    if (a.publishedAt === null) return 1;
    if (b.publishedAt === null) return -1;
    return b.publishedAt - a.publishedAt;
  });

  const data = { items: unique.slice(0, MAX_ITEMS) };
  cache = { time: Date.now(), data };
  stale = { time: Date.now(), data };
  return NextResponse.json(data);
}