import { XMLParser } from "fast-xml-parser";

export type NewsItem = {
  title: string;
  link: string;
  source: string;
  publishedAt: number | null;
  summary: string;
};

const MAX_SUMMARY_LENGTH = 160;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

// processEntities is disabled on the parser, so this is the only decoding pass.
function decodeHtmlEntities(input: string): string {
  return input.replace(
    /&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z][a-zA-Z0-9]*);/g,
    (match: string, body: string): string => {
      if (body.charAt(0) === "#") {
        const isHex = body.charAt(1) === "x" || body.charAt(1) === "X";
        const digits = isHex ? body.slice(2) : body.slice(1);
        const codePoint = isHex ? parseInt(digits, 16) : parseInt(digits, 10);
        if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
          return match;
        }
        try {
          return String.fromCodePoint(codePoint);
        } catch {
          return match;
        }
      }
      return (
        NAMED_ENTITIES[body] ?? NAMED_ENTITIES[body.toLowerCase()] ?? match
      );
    }
  );
}

function stripHtml(input: string): string {
  // Unwrap CDATA sections first, otherwise a stray "]]>" survives tag stripping.
  const withoutCdata = input.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  const withoutTags = withoutCdata.replace(/<[^>]*>/g, " ");
  return decodeHtmlEntities(withoutTags).replace(/\s+/g, " ").trim();
}

function toText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

const parser = new XMLParser({
  ignoreAttributes: true,
  processEntities: false,
  parseTagValue: false,
  trimValues: true,
  // Descriptions contain HTML, so keep their inner XML as raw text instead of
  // parsing child tags into an object.
  stopNodes: ["*.description", "*.summary", "*.content:encoded"],
});

export function parseRssItems(xml: string, source: string): NewsItem[] {
  try {
    if (typeof xml !== "string" || xml.trim().length === 0) return [];

    const parsed: unknown = parser.parse(xml);
    if (!parsed || typeof parsed !== "object") return [];
    const rss = (parsed as { rss?: unknown }).rss;
    if (!rss || typeof rss !== "object") return [];
    const channel = (rss as { channel?: unknown }).channel;
    if (!channel || typeof channel !== "object") return [];
    const rawItems = (channel as { item?: unknown }).item;
    if (rawItems === undefined || rawItems === null) return [];

    const list = Array.isArray(rawItems) ? rawItems : [rawItems];
    const items: NewsItem[] = [];

    for (const raw of list) {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
      const item = raw as Record<string, unknown>;

      const title = toText(item.title).trim();
      const link = toText(item.link).trim();
      if (title.length === 0 || link.length === 0) continue;
      if (!/^https?:\/\//i.test(link)) continue;

      const rawSummary = toText(item.description ?? item.summary);
      const summary = stripHtml(rawSummary).slice(0, MAX_SUMMARY_LENGTH);

      const rawDate = toText(item.pubDate ?? item.published);
      const parsedDate = rawDate.length > 0 ? Date.parse(rawDate) : Number.NaN;

      items.push({
        title,
        link,
        source,
        publishedAt: Number.isFinite(parsedDate) ? parsedDate : null,
        summary,
      });
    }

    return items;
  } catch {
    return [];
  }
}