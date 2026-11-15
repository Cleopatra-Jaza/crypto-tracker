import { describe, it, expect } from "vitest";
import { parseRssItems } from "./news";

const wrap = (items: string): string =>
  `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Feed</title>${items}</channel></rss>`;

describe("parseRssItems", () => {
  it("parses a single item with title, link, source, date and summary", () => {
    const xml = wrap(
      "<item><title>Bitcoin hits new high</title>" +
        "<link>https://cointelegraph.com/news/bitcoin-hits-new-high</link>" +
        "<pubDate>Mon, 10 Nov 2025 12:00:00 GMT</pubDate>" +
        "<description>Bitcoin rallied today.</description></item>"
    );

    const items = parseRssItems(xml, "Cointelegraph");

    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Bitcoin hits new high");
    expect(items[0].link).toBe("https://cointelegraph.com/news/bitcoin-hits-new-high");
    expect(items[0].source).toBe("Cointelegraph");
    expect(items[0].publishedAt).toBe(
      Date.parse("Mon, 10 Nov 2025 12:00:00 GMT")
    );
    expect(items[0].publishedAt).toBeGreaterThan(0);
    expect(items[0].summary).toBe("Bitcoin rallied today.");
  });

  it("parses multiple items and keeps their document order", () => {
    const xml = wrap(
      "<item><title>First</title><link>https://example.com/1</link>" +
        "<pubDate>Mon, 10 Nov 2025 12:00:00 GMT</pubDate><description>One</description></item>" +
        "<item><title>Second</title><link>http://example.com/2</link>" +
        "<description>Two</description></item>"
    );

    const items = parseRssItems(xml, "CoinDesk");

    expect(items).toHaveLength(2);
    expect(items[0].title).toBe("First");
    expect(items[1].title).toBe("Second");
    expect(items[0].link).toBe("https://example.com/1");
    expect(items[1].link).toBe("http://example.com/2");
    expect(items[1].publishedAt).toBeNull();
  });

  it("reads a CDATA title verbatim", () => {
    const xml = wrap(
      "<item><title><![CDATA[CoinDesk: Bitcoin & Ethereum rally]]></title>" +
        "<link>https://www.coindesk.com/markets/rally</link>" +
        "<description>Markets moved.</description></item>"
    );

    const items = parseRssItems(xml, "CoinDesk");

    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("CoinDesk: Bitcoin & Ethereum rally");
    expect(items[0].link).toBe("https://www.coindesk.com/markets/rally");
  });

  it("strips HTML tags, decodes entities and collapses whitespace", () => {
    const xml = wrap(
      "<item><title>Strip</title><link>https://example.com/strip</link>" +
        "<description><p>Hello <b>world</b></p> &amp; welcome</description></item>"
    );

    const items = parseRssItems(xml, "Cointelegraph");

    expect(items).toHaveLength(1);
    expect(items[0].summary).toBe("Hello world & welcome");
  });

  it("strips HTML inside a CDATA description without leaving a CDATA marker", () => {
    const xml = wrap(
      "<item><title>Cdata html</title><link>https://example.com/cdata</link>" +
        "<description><![CDATA[<p>Bitcoin &amp; ETH</p> rally]]></description></item>"
    );

    const items = parseRssItems(xml, "Cointelegraph");

    expect(items).toHaveLength(1);
    expect(items[0].summary).toBe("Bitcoin & ETH rally");
  });

  it("cuts the summary to 160 characters", () => {
    const longText = "a".repeat(200);
    const xml = wrap(
      `<item><title>Long</title><link>https://example.com/long</link>` +
        `<description>${longText}</description></item>`
    );

    const items = parseRssItems(xml, "Cointelegraph");

    expect(items).toHaveLength(1);
    expect(items[0].summary).toHaveLength(160);
    expect(items[0].summary).toBe("a".repeat(160));
  });

  it("skips items without a link or without a title", () => {
    const xml = wrap(
      "<item><title>No link here</title><description>No link</description></item>" +
        "<item><link>https://example.com/no-title</link><description>No title</description></item>"
    );

    expect(parseRssItems(xml, "Cointelegraph")).toEqual([]);
  });

  it("skips non-http(s) links such as javascript: and ftp:", () => {
    const xml = wrap(
      "<item><title>Bad scheme</title><link>javascript:alert(1)</link></item>" +
        "<item><title>Also bad</title><link>ftp://example.com/file</link></item>"
    );

    expect(parseRssItems(xml, "CoinDesk")).toEqual([]);
  });

  it("returns an empty array for invalid or empty XML", () => {
    expect(parseRssItems("this is not xml", "Cointelegraph")).toEqual([]);
    expect(parseRssItems("", "Cointelegraph")).toEqual([]);
    expect(parseRssItems("<rss><channel>", "Cointelegraph")).toEqual([]);
  });
});