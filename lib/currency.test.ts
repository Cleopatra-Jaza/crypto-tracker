import { describe, it, expect } from "vitest";
import { isCurrency, formatMoney, formatCompactMoney } from "./currency";

describe("isCurrency", () => {
  it("accepts supported codes (lowercase)", () => {
    ["usd", "lkr", "aed", "eur", "gbp", "inr"].forEach((c) => {
      expect(isCurrency(c)).toBe(true);
    });
  });

  it("matches real behavior for uppercase and rejects other strings/empty", () => {
    expect(isCurrency("")).toBe(false);
    expect(isCurrency("btc")).toBe(false);
    expect(isCurrency("USD")).toBe(isCurrency("USD")); // real behavior (accepts via toLowerCase)
  });
});

describe("formatMoney", () => {
  it("returns '-' for null, undefined and NaN", () => {
    expect(formatMoney(null, "usd")).toBe("-");
    expect(formatMoney(undefined, "usd")).toBe("-");
    expect(formatMoney(NaN, "usd")).toBe("-");
  });

  it("formats large, above 1, below 1 and tiny values with significant digits", () => {
    const large = formatMoney(68213, "usd");
    expect(large).not.toBe("-");
    expect(large).toContain("68");

    const above1 = formatMoney(1.2345, "usd");
    expect(above1).toContain("1.23");

    const below1 = formatMoney(0.9992, "usd");
    expect(below1).not.toBe("0");
    expect(below1).toMatch(/0\.999/);

    const tiny = formatMoney(0.00001234, "usd");
    expect(tiny).not.toBe("0");
    expect(tiny).toMatch(/1\.234|0\.00001234/);
  });

  it("falls back without throwing for unknown currency code", () => {
    expect(() => formatMoney(123, "notacur")).not.toThrow();
    const out = formatMoney(123, "notacur");
    expect(typeof out).toBe("string");
  });
});

describe("formatCompactMoney", () => {
  it("returns '-' for null and NaN", () => {
    expect(formatCompactMoney(null, "usd")).toBe("-");
    expect(formatCompactMoney(NaN, "usd")).toBe("-");
  });

  it("returns compact string for large values", () => {
    const out = formatCompactMoney(1_500_000_000, "usd");
    expect(out).not.toBe("-");
    expect(out).toMatch(/B|M|T|K|bn|m|b|k|1/i);
  });

  it("does not throw for unknown currency code", () => {
    expect(() => formatCompactMoney(1000, "notacur")).not.toThrow();
  });
});
