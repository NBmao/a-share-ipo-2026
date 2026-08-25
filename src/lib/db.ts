import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

export function getDatabaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.NEON_DATABASE_URL ||
    undefined
  );
}

export function hasDatabase(): boolean {
  return Boolean(getDatabaseUrl());
}

let cached: NeonQueryFunction<false, false> | null = null;

export function sql() {
  const url = getDatabaseUrl();
  if (!url) {
    throw new Error("未配置 DATABASE_URL，无法连接 Postgres");
  }
  if (!cached) {
    cached = neon(url);
  }
  return cached;
}

export async function ensureSchema() {
  const db = sql();
  await db`
    CREATE TABLE IF NOT EXISTS ipo_meta (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      as_of TEXT NOT NULL,
      source TEXT NOT NULL,
      note TEXT NOT NULL,
      count INTEGER NOT NULL,
      boards JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS ipo_items (
      code TEXT PRIMARY KEY,
      payload JSONB NOT NULL
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS trades (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      board TEXT NOT NULL,
      listing_date TEXT,
      buy_price DOUBLE PRECISION NOT NULL,
      shares DOUBLE PRECISION NOT NULL,
      sell_price DOUBLE PRECISION,
      pnl DOUBLE PRECISION NOT NULL DEFAULT 0,
      note TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS trades_meta (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      updated_at TIMESTAMPTZ
    )
  `;
}
