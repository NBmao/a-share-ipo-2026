#!/usr/bin/env node
/**
 * Seed / refresh Neon Postgres from local JSON files.
 * Usage: DATABASE_URL=... node --experimental-strip-types scripts/seed-db.mjs
 *    or: npx tsx scripts/seed-db.ts
 */
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { neon } from "@neondatabase/serverless";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const url =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;

if (!url) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const sql = neon(url);

async function main() {
  const ipo = JSON.parse(
    await fs.readFile(path.join(root, "data/ipo_2026.json"), "utf8"),
  );
  const tradesFile = JSON.parse(
    await fs.readFile(path.join(root, "data/trades.json"), "utf8"),
  );

  await sql`
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
  await sql`
    CREATE TABLE IF NOT EXISTS ipo_items (
      code TEXT PRIMARY KEY,
      payload JSONB NOT NULL
    )
  `;
  await sql`
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
  await sql`
    CREATE TABLE IF NOT EXISTS trades_meta (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      updated_at TIMESTAMPTZ
    )
  `;

  await sql`
    INSERT INTO ipo_meta (id, as_of, source, note, count, boards, updated_at)
    VALUES (
      1,
      ${ipo.asOf},
      ${ipo.source},
      ${ipo.note},
      ${ipo.count},
      ${JSON.stringify(ipo.boards)}::jsonb,
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      as_of = EXCLUDED.as_of,
      source = EXCLUDED.source,
      note = EXCLUDED.note,
      count = EXCLUDED.count,
      boards = EXCLUDED.boards,
      updated_at = NOW()
  `;
  await sql`DELETE FROM ipo_items`;
  for (const item of ipo.items) {
    await sql`
      INSERT INTO ipo_items (code, payload)
      VALUES (${item["股票代码"]}, ${JSON.stringify(item)}::jsonb)
    `;
  }

  await sql`DELETE FROM trades`;
  for (const trade of tradesFile.trades ?? []) {
    await sql`
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
  await sql`
    INSERT INTO trades_meta (id, updated_at)
    VALUES (1, ${tradesFile.updatedAt})
    ON CONFLICT (id) DO UPDATE SET updated_at = EXCLUDED.updated_at
  `;

  console.log(
    `Seeded ${ipo.items.length} IPO rows and ${(tradesFile.trades ?? []).length} trades.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
