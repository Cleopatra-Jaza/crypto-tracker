"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type LiveCoin = { id: string; symbol: string; market_cap_rank: number | null };
export type LiveStatus = "off" | "connecting" | "live";

const WS_URL = "wss://data-stream.binance.vision/stream";
const MAX_BACKOFF_MS = 30000;
const FLUSH_MS = 2000;

type StreamInfo = {
  streamKey: string;
  streamNames: string[];
  // Map Binance symbol (e.g. "BTCUSDT") to coin id
  symbolToId: Record<string, string>;
};

export function buildStreamInfo(coins: LiveCoin[]): StreamInfo {
  // Only coins with rank not null and <= 300
  const eligible = coins.filter(
    (c) => c.market_cap_rank != null && c.market_cap_rank <= 300 && c.symbol
  );

  // Deduplicate by symbol (lowercase): keep lowest market_cap_rank
  const bySymbol = new Map<string, LiveCoin>();
  for (const c of eligible) {
    const sym = c.symbol.toLowerCase();
    const prev = bySymbol.get(sym);
    if (!prev) {
      bySymbol.set(sym, c);
    } else {
      const prevRank = prev.market_cap_rank ?? Number.POSITIVE_INFINITY;
      const curRank = c.market_cap_rank ?? Number.POSITIVE_INFINITY;
      if (curRank < prevRank) bySymbol.set(sym, c);
    }
  }

  const selected = Array.from(bySymbol.values());
  const streamNames = selected
    .map((c) => `${c.symbol.toLowerCase()}usdt@miniTicker`)
    .sort();

  const symbolToId: Record<string, string> = {};
  for (const c of selected) {
    const binanceSymbol = `${c.symbol.toUpperCase()}USDT`;
    symbolToId[binanceSymbol] = c.id;
  }

  return {
    streamKey: streamNames.join(","),
    streamNames,
    symbolToId,
  };
}

export function useLivePrices(
  coins: LiveCoin[],
  enabled: boolean
): { prices: Record<string, number>; status: LiveStatus } {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<LiveStatus>("off");

  // Stable info derived from coins; key is used to avoid reconnect on unrelated refreshes
  const { streamKey, streamNames, symbolToId } = useMemo(
    () => buildStreamInfo(coins),
    [coins]
  );

  // Refs for mutable runtime state (no re-renders/reconnect churn)
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const backoffRef = useRef(1000);
  const bufferRef = useRef<Record<string, number>>({});
  const dirtyRef = useRef(false);
  const gotFirstRef = useRef(false);
  const symbolToIdRef = useRef<Record<string, string>>(symbolToId);
  const enabledRef = useRef(enabled);
  const streamNamesRef = useRef<string[]>(streamNames);

  // Keep latest values available to callbacks/socket handlers
  useEffect(() => {
    symbolToIdRef.current = symbolToId;
    enabledRef.current = enabled;
    streamNamesRef.current = streamNames;
  }, [symbolToId, enabled, streamNames]);

  useEffect(() => {
    // SSR-safe: only run in browser
    if (typeof window === "undefined") return;

    let disposed = false;

    const clearReconnect = () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const clearFlush = () => {
      if (flushTimerRef.current) {
        clearInterval(flushTimerRef.current);
        flushTimerRef.current = null;
      }
    };

    const closeSocket = () => {
      const ws = wsRef.current;
      wsRef.current = null;
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        try {
          ws.close();
        } catch {
          // ignore
        }
      }
    };

    const stopAll = (nextStatus: LiveStatus) => {
      clearReconnect();
      clearFlush();
      closeSocket();
      bufferRef.current = {};
      dirtyRef.current = false;
      gotFirstRef.current = false;
      if (!disposed) setStatus(nextStatus);
    };

    const scheduleReconnect = () => {
      if (disposed) return;
      if (!enabledRef.current) return;
      if (document.visibilityState === "hidden") return;
      if (streamNamesRef.current.length === 0) return;
      clearReconnect();
      const delay = backoffRef.current;
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        connect();
      }, delay);
      backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS);
    };

    const startFlush = () => {
      clearFlush();
      flushTimerRef.current = setInterval(() => {
        if (!dirtyRef.current) return;
        dirtyRef.current = false;
        // Copy buffered prices into state
        setPrices((prev) => ({ ...prev, ...bufferRef.current }));
      }, FLUSH_MS);
    };

    const connect = () => {
      if (disposed) return;
      if (!enabledRef.current) return;
      if (document.visibilityState === "hidden") return;
      const names = streamNamesRef.current;
      if (names.length === 0) {
        setStatus("off");
        return;
      }

      // Close any existing socket before opening a new one
      closeSocket();
      clearReconnect();
      gotFirstRef.current = false;

      setStatus("connecting");

      let ws: WebSocket;
      try {
        ws = new WebSocket(WS_URL);
      } catch {
        scheduleReconnect();
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => {
        if (disposed || wsRef.current !== ws) return;
        // Reset backoff after successful open
        backoffRef.current = 1000;
        // Subscribe once to all streams
        try {
          ws.send(
            JSON.stringify({
              method: "SUBSCRIBE",
              params: streamNamesRef.current,
              id: 1,
            })
          );
        } catch {
          // send failed; will reconnect on close/error
        }
        startFlush();
      };

      ws.onmessage = (event) => {
        if (disposed || wsRef.current !== ws) return;
        let msg: unknown;
        try {
          msg = JSON.parse(String(event.data));
        } catch {
          return;
        }
        if (!msg || typeof msg !== "object") return;
        const obj = msg as Record<string, unknown>;

        // Ignore subscription replies like {"result":null,"id":1}
        if ("result" in obj && "id" in obj && !("data" in obj)) return;

        // Combined stream: {"stream":"...","data":{...}}
        const data =
          obj.data && typeof obj.data === "object"
            ? (obj.data as Record<string, unknown>)
            : null;
        if (!data) return;

        const s = data.s;
        const c = data.c;
        if (typeof s !== "string" || typeof c !== "string") return;

        const coinId = symbolToIdRef.current[s];
        if (!coinId) return;

        const price = Number(c);
        if (!Number.isFinite(price) || price <= 0) return;

        bufferRef.current[coinId] = price;
        dirtyRef.current = true;

        if (!gotFirstRef.current) {
          gotFirstRef.current = true;
          setStatus("live");
        }
      };

      ws.onerror = () => {
        // Let onclose handle reconnect
      };

      ws.onclose = () => {
        if (disposed || wsRef.current !== ws) return;
        wsRef.current = null;
        clearFlush();
        if (!disposed) setStatus("off");
        scheduleReconnect();
      };
    };

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        // Pause: close socket and clear timers
        stopAll("off");
      } else {
        // Resume if enabled
        if (enabledRef.current && streamNamesRef.current.length > 0) {
          backoffRef.current = 1000;
          connect();
        }
      }
    };

    // Start/stop based on enabled and stream set
    if (!enabled || streamKey.length === 0) {
      stopAll("off");
    } else {
      // (Re)connect when enabled or stream set changes
      connect();
    }

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      stopAll("off");
    };
    // Reconnect only when enabled or the set of streams actually changes
  }, [enabled, streamKey]);

  return { prices, status };
}
