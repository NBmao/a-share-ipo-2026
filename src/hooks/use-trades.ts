"use client";

import { useCallback, useEffect, useState } from "react";
import type { Trade } from "@/lib/trades";

async function fetchTrades(): Promise<Trade[]> {
  const response = await fetch("/api/trades", { cache: "no-store" });
  if (!response.ok) throw new Error("读取交易记录失败");
  const data = (await response.json()) as { trades?: Trade[] };
  return Array.isArray(data.trades) ? data.trades : [];
}

async function saveTrades(trades: Trade[]): Promise<Trade[]> {
  const response = await fetch("/api/trades", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trades }),
  });
  if (!response.ok) throw new Error("保存交易记录失败");
  const data = (await response.json()) as { trades?: Trade[] };
  return Array.isArray(data.trades) ? data.trades : trades;
}

export function useTrades() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchTrades()
      .then((items) => {
        if (!cancelled) {
          setTrades(items);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "读取失败");
        }
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const upsert = useCallback(async (trade: Trade) => {
    setError(null);
    setTrades((current) => {
      const index = current.findIndex((item) => item.id === trade.id);
      const next =
        index === -1
          ? [trade, ...current]
          : current.map((item, i) => (i === index ? trade : item));
      void saveTrades(next).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "保存失败");
        void fetchTrades().then(setTrades);
      });
      return next;
    });
  }, []);

  const remove = useCallback(async (id: string) => {
    setError(null);
    setTrades((current) => {
      const next = current.filter((item) => item.id !== id);
      void saveTrades(next).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "保存失败");
        void fetchTrades().then(setTrades);
      });
      return next;
    });
  }, []);

  return { trades, ready, error, upsert, remove };
}
