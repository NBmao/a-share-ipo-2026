"use client";

import { useCallback, useSyncExternalStore } from "react";
import { TRADES_STORAGE_KEY, type Trade } from "@/lib/trades";

let memory: Trade[] | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function readTrades(): Trade[] {
  if (memory) return memory;
  try {
    const raw = window.localStorage.getItem(TRADES_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Trade[]) : [];
    memory = Array.isArray(parsed) ? parsed : [];
  } catch {
    memory = [];
  }
  return memory;
}

function writeTrades(next: Trade[]) {
  memory = next;
  window.localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(next));
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTrades() {
  const trades = useSyncExternalStore(subscribe, readTrades, () => []);

  const upsert = useCallback((trade: Trade) => {
    const current = readTrades();
    const index = current.findIndex((item) => item.id === trade.id);
    if (index === -1) writeTrades([trade, ...current]);
    else {
      const next = [...current];
      next[index] = trade;
      writeTrades(next);
    }
  }, []);

  const remove = useCallback((id: string) => {
    writeTrades(readTrades().filter((item) => item.id !== id));
  }, []);

  return { trades, upsert, remove };
}
