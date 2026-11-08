export type CurrencyCode = "usd" | "lkr" | "aed" | "eur" | "gbp" | "inr";

export const CURRENCIES: {
  code: CurrencyCode;
  symbol: string;
  label: string;
}[] = [
  { code: "usd", symbol: "$", label: "USD" },
  { code: "lkr", symbol: "Rs", label: "LKR" },
  { code: "aed", symbol: "AED", label: "AED" },
  { code: "eur", symbol: "EUR", label: "EUR" },
  { code: "gbp", symbol: "GBP", label: "GBP" },
  { code: "inr", symbol: "INR", label: "INR" },
];

export function isCurrency(value: string): value is CurrencyCode {
  return CURRENCIES.some((c) => c.code === value.toLowerCase());
}

export function formatMoney(
  value: number | null | undefined,
  code: string
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }
  try {
    const formatted = new Intl.NumberFormat("en", {
      style: "currency",
      currency: code.toUpperCase(),
      maximumFractionDigits: value >= 1 ? 2 : undefined,
      maximumSignificantDigits: value < 1 ? 4 : undefined,
    }).format(value);
    return formatted;
  } catch {
    return `${value}`;
  }
}
