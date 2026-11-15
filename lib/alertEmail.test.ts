import { describe, it, expect } from "vitest";
import { evaluateAlert, escapeHtml, buildAlertEmail } from "./alertEmail";

describe("evaluateAlert", () => {
  it("triggers at equal value for both directions", () => {
    expect(evaluateAlert("above", 100, 100)).toBe(true);
    expect(evaluateAlert("below", 100, 100)).toBe(true);
  });

  it("triggers above when current is higher and below when current is lower", () => {
    expect(evaluateAlert("above", 100, 101)).toBe(true);
    expect(evaluateAlert("below", 100, 99)).toBe(true);
  });

  it("does not trigger just below/above threshold", () => {
    expect(evaluateAlert("above", 100, 99.99)).toBe(false);
    expect(evaluateAlert("below", 100, 100.01)).toBe(false);
  });

  it("returns false for invalid direction", () => {
    expect(evaluateAlert("sideways", 100, 100)).toBe(false);
    expect(evaluateAlert("", 100, 100)).toBe(false);
  });

  it("returns false for NaN and Infinity values", () => {
    expect(evaluateAlert("above", NaN, 100)).toBe(false);
    expect(evaluateAlert("above", 100, NaN)).toBe(false);
    expect(evaluateAlert("below", Infinity, 100)).toBe(false);
    expect(evaluateAlert("below", 100, Infinity)).toBe(false);
    expect(evaluateAlert("above", -Infinity, 100)).toBe(false);
  });
});

describe("escapeHtml", () => {
  it("escapes all five characters", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });
});

describe("buildAlertEmail", () => {
  it("uses 'went above' for above direction", () => {
    const result = buildAlertEmail({
      coinName: "Bitcoin",
      coinId: "bitcoin",
      direction: "above",
      targetPrice: 70000,
      currentPrice: 71000,
    });
    expect(result.subject).toContain("went above");
    expect(result.subject).toContain("70,000");
  });

  it("uses 'dropped below' for below direction", () => {
    const result = buildAlertEmail({
      coinName: "Bitcoin",
      coinId: "bitcoin",
      direction: "below",
      targetPrice: 70000,
      currentPrice: 69000,
    });
    expect(result.subject).toContain("dropped below");
    expect(result.subject).toContain("70,000");
  });

  it("escapes dangerous coin name in html", () => {
    const result = buildAlertEmail({
      coinName: "<script>alert(1)</script>",
      coinId: "evil",
      direction: "above",
      targetPrice: 1,
      currentPrice: 2,
    });
    expect(result.html).not.toContain("<script>");
    expect(result.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("includes URL-encoded coin link in text", () => {
    const result = buildAlertEmail({
      coinName: "Test",
      coinId: "a b/c",
      direction: "above",
      targetPrice: 1,
      currentPrice: 2,
    });
    expect(result.text).toContain("/coin/a%20b%2Fc");
  });

  it("cuts very long coin name to 60 characters in subject", () => {
    const longName = "A".repeat(80);
    const result = buildAlertEmail({
      coinName: longName,
      coinId: "test",
      direction: "above",
      targetPrice: 1,
      currentPrice: 2,
    });
    expect(result.subject.startsWith("A".repeat(60))).toBe(true);
    expect(result.subject).not.toContain("A".repeat(61));
  });
});
