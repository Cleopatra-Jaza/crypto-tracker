import { describe, it, expect } from "vitest";
import { buildStreamInfo } from "./useLivePrices";

describe("buildStreamInfo", () => {
  it("returns empty streamKey, streamNames and symbolToId for an empty list", () => {
    const info = buildStreamInfo([]);

    expect(info.streamKey).toBe("");
    expect(info.streamNames).toEqual([]);
    expect(info.symbolToId).toEqual({});
  });

  it("skips coins whose market_cap_rank is null", () => {
    const info = buildStreamInfo([
      { id: "a", symbol: "BTC", market_cap_rank: null },
    ]);

    expect(info.streamKey).toBe("");
    expect(info.streamNames).toEqual([]);
    expect(info.symbolToId).toEqual({});
  });

  it("skips coins whose market_cap_rank is above 300", () => {
    const info = buildStreamInfo([
      { id: "over", symbol: "AAA", market_cap_rank: 301 },
    ]);

    expect(info.streamKey).toBe("");
    expect(info.streamNames).toEqual([]);
    expect(info.symbolToId).toEqual({});
  });

  it("includes a coin whose market_cap_rank is exactly 300", () => {
    const info = buildStreamInfo([
      { id: "edge", symbol: "BBB", market_cap_rank: 300 },
    ]);

    expect(info.streamNames).toEqual(["bbbusdt@miniTicker"]);
    expect(info.streamKey).toBe("bbbusdt@miniTicker");
    expect(info.symbolToId).toEqual({ BBBUSDT: "edge" });
  });

  it("skips coins with an empty symbol", () => {
    const info = buildStreamInfo([
      { id: "x", symbol: "", market_cap_rank: 1 },
    ]);

    expect(info.streamKey).toBe("");
    expect(info.streamNames).toEqual([]);
    expect(info.symbolToId).toEqual({});
  });

  it("builds stream names from the lowercase symbol plus usdt@miniTicker", () => {
    const info = buildStreamInfo([
      { id: "btc", symbol: "BTC", market_cap_rank: 1 },
    ]);

    expect(info.streamNames).toEqual(["btcusdt@miniTicker"]);
    expect(info.streamKey).toBe("btcusdt@miniTicker");
  });

  it("keeps only the lowest rank when the same symbol appears with different case", () => {
    const info = buildStreamInfo([
      { id: "high", symbol: "btc", market_cap_rank: 50 },
      { id: "low", symbol: "BTC", market_cap_rank: 10 },
    ]);

    expect(info.streamNames).toEqual(["btcusdt@miniTicker"]);
    expect(info.symbolToId).toEqual({ BTCUSDT: "low" });

    const reversed = buildStreamInfo([
      { id: "low", symbol: "BTC", market_cap_rank: 10 },
      { id: "high", symbol: "btc", market_cap_rank: 50 },
    ]);

    expect(reversed.streamNames).toEqual(["btcusdt@miniTicker"]);
    expect(reversed.symbolToId).toEqual({ BTCUSDT: "low" });
  });

  it("maps the uppercase Binance symbol to the coin id", () => {
    const info = buildStreamInfo([
      { id: "bitcoin", symbol: "BTC", market_cap_rank: 1 },
      { id: "ethereum", symbol: "eth", market_cap_rank: 2 },
    ]);

    expect(info.symbolToId).toEqual({
      BTCUSDT: "bitcoin",
      ETHUSDT: "ethereum",
    });
  });

  it("sorts stream names into streamKey and is independent of input order", () => {
    const a = buildStreamInfo([
      { id: "bitcoin", symbol: "BTC", market_cap_rank: 1 },
      { id: "ethereum", symbol: "ETH", market_cap_rank: 2 },
    ]);
    const b = buildStreamInfo([
      { id: "ethereum", symbol: "ETH", market_cap_rank: 2 },
      { id: "bitcoin", symbol: "BTC", market_cap_rank: 1 },
    ]);

    expect(a.streamNames).toEqual(["btcusdt@miniTicker", "ethusdt@miniTicker"]);
    expect(a.streamKey).toBe("btcusdt@miniTicker,ethusdt@miniTicker");
    expect(b.streamNames).toEqual(a.streamNames);
    expect(b.streamKey).toBe(a.streamKey);
  });
});