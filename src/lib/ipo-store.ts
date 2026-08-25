import { promises as fs } from "fs";
import path from "path";
import type { Board, IpoItem, IpoPayload } from "@/lib/ipo";
import { BOARDS } from "@/lib/ipo";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";

const IPO_PATH = path.join(process.cwd(), "data", "ipo_2026.json");

async function readLocalIpo(): Promise<IpoPayload> {
  const raw = await fs.readFile(IPO_PATH, "utf8");
  return JSON.parse(raw) as IpoPayload;
}

function emptyBoards(): Record<Board, number> {
  return Object.fromEntries(BOARDS.map((board) => [board, 0])) as Record<
    Board,
    number
  >;
}

async function readDbIpo(): Promise<IpoPayload | null> {
  await ensureSchema();
  const db = sql();
  const metaRows = await db`
    SELECT as_of, source, note, count, boards
    FROM ipo_meta
    WHERE id = 1
  `;
  if (!metaRows.length) return null;

  const itemRows = await db`SELECT payload FROM ipo_items ORDER BY code`;
  const meta = metaRows[0] as {
    as_of: string;
    source: string;
    note: string;
    count: number;
    boards: Record<Board, number>;
  };

  return {
    asOf: meta.as_of,
    source: meta.source,
    note: meta.note,
    count: Number(meta.count),
    boards: meta.boards ?? emptyBoards(),
    items: itemRows.map((row) => (row as { payload: IpoItem }).payload),
  };
}

export async function writeIpoPayload(payload: IpoPayload): Promise<void> {
  if (!hasDatabase()) {
    await fs.mkdir(path.dirname(IPO_PATH), { recursive: true });
    await fs.writeFile(IPO_PATH, JSON.stringify(payload, null, 2), "utf8");
    return;
  }

  await ensureSchema();
  const db = sql();
  await db`
    INSERT INTO ipo_meta (id, as_of, source, note, count, boards, updated_at)
    VALUES (
      1,
      ${payload.asOf},
      ${payload.source},
      ${payload.note},
      ${payload.count},
      ${JSON.stringify(payload.boards)}::jsonb,
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

  await db`DELETE FROM ipo_items`;
  for (const item of payload.items) {
    await db`
      INSERT INTO ipo_items (code, payload)
      VALUES (${item.股票代码}, ${JSON.stringify(item)}::jsonb)
    `;
  }
}

export async function seedIpoFromLocalIfEmpty(): Promise<boolean> {
  if (!hasDatabase()) return false;
  await ensureSchema();
  const db = sql();
  const rows = await db`SELECT count(*)::int AS n FROM ipo_items`;
  const n = Number((rows[0] as { n: number }).n);
  if (n > 0) return false;
  const payload = await readLocalIpo();
  await writeIpoPayload(payload);
  return true;
}

export async function readIpoPayload(): Promise<IpoPayload> {
  if (!hasDatabase()) {
    return readLocalIpo();
  }
  await seedIpoFromLocalIfEmpty();
  const fromDb = await readDbIpo();
  if (fromDb) return fromDb;
  return readLocalIpo();
}
