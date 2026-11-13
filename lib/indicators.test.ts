import { describe, it, expect } from "vitest";
import { sma, ema, rsi, macd, type Point } from "./indicators";

const mk = (values: number[]): Point[] =>
  values.map((v, i) => ({ time: i, value: v }));

const allFinite = (pts: Point[]) => pts.every((p) => Number.isFinite(p.value));

describe("sma", () => {
  it("computes SMA values at correct times", () => {
    const res = sma(mk([1, 2, 3, 4, 5]), 3);
    expect(res.map((p) => p.value)).toEqual([2, 3, 4]);
    expect(res.map((p) => p.time)).toEqual([2, 3, 4]);
  });

  it("returns empty for empty input, short input, or invalid period", () => {
    expect(sma([], 3)).toEqual([]);
    expect(sma(mk([1, 2]), 3)).toEqual([]);
    expect(sma(mk([1, 2, 3]), 0)).toEqual([]);
  });

  it("produces finite values", () => {
    expect(allFinite(sma(mk([10, 20, 30, 40, 50]), 2))).toBe(true);
  });
});

describe("ema", () => {
  it("seeds with SMA of first period", () => {
    const res = ema(mk([1, 2, 3, 4, 5]), 3);
    expect(res[0].value).toBe(2);
    expect(res[0].time).toBe(2);
  });

  it("computes EMA after seed", () => {
    const res = ema(mk([1, 2, 3, 4, 5]), 3);
    // multiplier 2/(3+1)=0.5, EMA(4)=4*0.5+2*0.5=3, EMA(5)=5*0.5+3*0.5=4
    expect(res[1].value).toBe(3);
    expect(res[2].value).toBe(4);
  });

  it("returns empty for empty/short input", () => {
    expect(ema([], 3)).toEqual([]);
    expect(ema(mk([1, 2]), 3)).toEqual([]);
  });

  it("produces finite values", () => {
    expect(allFinite(ema(mk([1, 2, 3, 4, 5, 6]), 3))).toBe(true);
  });
});

describe("rsi", () => {
  it("RSI of a strictly rising series is 100", () => {
    const res = rsi(mk([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]), 14);
    expect(res.length).toBeGreaterThan(0);
    res.forEach((p) => expect(p.value).toBe(100));
  });

  it("RSI of equal gains and losses is about 50 and between 0 and 100", () => {
    // alternating up/down by 1: gains and losses balance
    const res = rsi(mk([1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1]), 14);
    expect(res.length).toBeGreaterThan(0);
    res.forEach((p) => {
      expect(p.value).toBeGreaterThanOrEqual(0);
      expect(p.value).toBeLessThanOrEqual(100);
      expect(p.value).toBeCloseTo(50, 5);
    });
  });

  it("returns empty for empty/short input", () => {
    expect(rsi([], 14)).toEqual([]);
    expect(rsi(mk([1, 2, 3]), 14)).toEqual([]);
  });

  it("produces finite values", () => {
    const res = rsi(mk([1, 3, 2, 5, 4, 6, 5, 7, 6, 8, 7, 9, 8, 10, 9]), 14);
    expect(allFinite(res)).toBe(true);
  });
});

describe("macd", () => {
  it("returns macd, signal and histogram arrays with histogram = macd - signal at matching times", () => {
    const data = mk(Array.from({ length: 60 }, (_, i) => 100 + i + Math.sin(i) * 2));
    const res = macd(data, 12, 26, 9);
    expect(Array.isArray(res.macd)).toBe(true);
    expect(Array.isArray(res.signal)).toBe(true);
    expect(Array.isArray(res.histogram)).toBe(true);
    expect(res.macd.length).toBeGreaterThan(0);
    expect(res.signal.length).toBeGreaterThan(0);
    expect(res.histogram.length).toBeGreaterThan(0);
    const sigMap = new Map(res.signal.map((p) => [p.time, p.value]));
    res.histogram.forEach((h) => {
      const m = res.macd.find((p) => p.time === h.time);
      const s = sigMap.get(h.time);
      expect(m).toBeDefined();
      expect(s).toBeDefined();
      expect(h.value).toBeCloseTo((m as Point).value - (s as number), 10);
    });
  });

  it("returns empty arrays for short input", () => {
    const res = macd(mk([1, 2, 3]), 12, 26, 9);
    expect(res.macd).toEqual([]);
    expect(res.signal).toEqual([]);
    expect(res.histogram).toEqual([]);
  });

  it("produces finite values", () => {
    const data = mk(Array.from({ length: 60 }, (_, i) => 50 + i));
    const res = macd(data, 12, 26, 9);
    expect(allFinite(res.macd)).toBe(true);
    expect(allFinite(res.signal)).toBe(true);
    expect(allFinite(res.histogram)).toBe(true);
  });
});
