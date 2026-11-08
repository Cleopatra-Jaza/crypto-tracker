"use client";

import { useCallback, useEffect, useState } from "react";
import { isCurrency } from "./currency";

export function useCurrency(): [string, (code: string) => void] {
  const [currency, setCurrencyState] = useState<string>("usd");

  const setCurrency = useCallback((code: string) => {
    if (!isCurrency(code)) return;
    const normalized = code.toLowerCase();
    try {
      localStorage.setItem("currency", normalized);
    } catch {}
    setCurrencyState(normalized);
    window.dispatchEvent(new Event("currency-change"));
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("currency");
      if (saved && isCurrency(saved)) {
        setCurrencyState(saved.toLowerCase());
      }
    } catch {}

    const handler = () => {
      try {
        const saved = localStorage.getItem("currency");
        if (saved && isCurrency(saved)) {
          setCurrencyState(saved.toLowerCase());
        }
      } catch {}
    };

    window.addEventListener("currency-change", handler);
    return () => window.removeEventListener("currency-change", handler);
  }, []);

  return [currency, setCurrency];
}
