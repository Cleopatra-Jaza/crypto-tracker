import { describe, it, expect } from "vitest";
import { escapeCsvCell, buildCsv } from "./csv";

describe("escapeCsvCell", () => {
  it("wraps a cell containing comma, doubled quotes and newline in quotes", () => {
    const out = escapeCsvCell('a,b"c\nd');
    expect(out).toBe('"a,b""c\nd"');
  });

  it("prefixes text cells starting with =, +, - or @ with a single quote", () => {
    expect(escapeCsvCell("=SUM(A1)")).toBe("\"'=SUM(A1)\"");
    expect(escapeCsvCell("+cmd")).toBe("\"'+cmd\"");
    expect(escapeCsvCell("-1")).toBe("\"'-1\"");
    expect(escapeCsvCell("@foo")).toBe("\"'@foo\"");
  });

  it("handles numbers and empty cells", () => {
    expect(escapeCsvCell(123)).toBe('"123"');
    expect(escapeCsvCell("")).toBe('""');
    expect(escapeCsvCell(null)).toBe('""');
  });
});

describe("buildCsv", () => {
  it("adds BOM and joins lines with newlines", () => {
    const header = ["Coin", "Amount"].map(escapeCsvCell).join(",");
    const row = ["BTC", "1"].map(escapeCsvCell).join(",");
    const csv = buildCsv([header, row]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toBe(`\uFEFF${header}\n${row}`);
  });
});
