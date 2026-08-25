import { promises as fs } from "fs";
import path from "path";
import type { Board } from "@/lib/ipo";
import type { Trade } from "@/lib/trades";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";

export type TradesFile = {
  updatedAt: string | null;
  trades: Trade[];
};

const TRADES_PATH = path.join(process.cwd(), "data", "trades.json");

function emptyFile(): TradesFile {
  return { updatedAt: null, trades: [] };
}

function parseTrades(raw: string): TradesFile {
  const parsed = JSON.parse(raw) as TradesFile | Trade[];
  if (Array.isArray(parsed)) return { updatedAt: null, trades: parsed };
  return {
    updatedAt: parsed.updatedAt ?? null,
    trades: Array.isArray(parsed.trades) ? parsed.trades : [],
  };
}

async function readLocal(): Promise<TradesFile> {
  try {
    const raw = await fs.readFile(TRADES_PATH, "utf8");
    return parseTrades(raw);
  } catch {
    return emptyFile();
  }
}

async function writeLocal(trades: Trade[]): Promise<TradesFile> {
  const payload: TradesFile = {
    updatedAt: new Date().toISOString(),
    trades,
  };
  await fs.mkdir(path.dirname(TRADES_PATH), { recursive: true });
  await fs.writeFile(TRADES_PATH, JSON.stringify(payload, null, 2), "utf8");
  return payload;
}

function rowToTrade(row: Record<string, unknown>): Trade {
  return {
    id: String(row.id),
    code: String(row.code),
    name: String(row.name),
    board: row.board as Board,
    listingDate: (row.listing_date as string | null) ?? null,
    buyPrice: Number(row.buy_price),
    shares: Number(row.shares),
    sellPrice:
      row.sell_price === null || row.sell_price === undefined
        ? null
        : Number(row.sell_price),
    pnl: Number(row.pnl),
    note: String(row.note ?? ""),
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
  };
}

async function readDb(): Promise<TradesFile> {
  await ensureSchema();
  const db = sql();
  const meta = await db`SELECT updated_at FROM trades_meta WHERE id = 1`;
  const rows = await db`
    SELECT
      id, code, name, board, listing_date, buy_price, shares,
      sell_price, pnl, note, created_at
    FROM trades
    ORDER BY created_at DESC
  `;
  return {
    updatedAt: meta.length
      ? new Date(
          (meta[0] as { updated_at: string | Date }).updated_at,
        ).toISOString()
      : null,
    trades: rows.map((row) => rowToTrade(row as Record<string, unknown>)),
  };
}

async function writeDb(trades: Trade[]): Promise<TradesFile> {
  await ensureSchema();
  const db = sql();
  await db`DELETE FROM trades`;
  for (const trade of trades) {
    await db`
      INSERT INTO trades (
        id, code, name, board, listing_date, buy_price, shares,
        sell_price, pnl, note, created_at
      ) VALUES (
        ${trade.id},
        ${trade.code},
        ${trade.name},
        ${trade.board},
        ${trade.listingDate},
        ${trade.buyPrice},
        ${trade.shares},
        ${trade.sellPrice},
        ${trade.pnl},
        ${trade.note},
        ${trade.createdAt}
      )
    `;
  }
  const updatedAt = new Date().toISOString();
  await db`
    INSERT INTO trades_meta (id, updated_at)
    VALUES (1, ${updatedAt})
    ON CONFLICT (id) DO UPDATE SET updated_at = EXCLUDED.updated_at
  `;
  return { updatedAt, trades };
}

export async function seedTradesFromLocalIfEmpty(): Promise<boolean> {
  if (!hasDatabase()) return false;
  await ensureSchema();
  const db = sql();
  const rows = await db`SELECT count(*)::int AS n FROM trades`;
  const n = Number((rows[0] as { n: number }).n);
  if (n > 0) return false;
  const local = await readLocal();
  if (!local.trades.length) {
    await db`
      INSERT INTO trades_meta (id, updated_at)
      VALUES (1, ${local.updatedAt})
      ON CONFLICT (id) DO NOTHING
    `;
    return false;
  }
  await writeDb(local.trades);
  return true;
}

export async function readTradesFile(): Promise<TradesFile> {
  if (!hasDatabase()) return readLocal();
  await seedTradesFromLocalIfEmpty();
  return readDb();
}

export async function writeTradesFile(trades: Trade[]): Promise<TradesFile> {
  if (!hasDatabase()) return writeLocal(trades);
  return writeDb(trades);
}
