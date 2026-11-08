"use client";

import { CURRENCIES } from "@/lib/currency";
import { useCurrency } from "@/lib/useCurrency";

export default function CurrencySelect() {
  const [currency, setCurrency] = useCurrency();
  return (
    <select
      value={currency}
      onChange={(e) => setCurrency(e.target.value)}
      className="rounded-lg border border-gray-500 bg-transparent px-2 py-1"
    >
      {CURRENCIES.map((c) => (
        <option key={c.code} value={c.code}>
          {c.label}
        </option>
      ))}
    </select>
  );
}
