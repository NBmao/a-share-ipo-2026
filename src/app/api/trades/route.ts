import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import type { Trade } from "@/lib/trades";

const TRADES_PATH = path.join(process.cwd(), "data", "trades.json");

type TradesFile = {
  updatedAt: string | null;
  trades: Trade[];
};

async function readTradesFile(): Promise<TradesFile> {
  try {
    const raw = await fs.readFile(TRADES_PATH, "utf8");
    const parsed = JSON.parse(raw) as TradesFile | Trade[];
    if (Array.isArray(parsed)) {
      return { updatedAt: null, trades: parsed };
    }
    return {
      updatedAt: parsed.updatedAt ?? null,
      trades: Array.isArray(parsed.trades) ? parsed.trades : [],
    };
  } catch {
    return { updatedAt: null, trades: [] };
  }
}

async function writeTradesFile(trades: Trade[]): Promise<TradesFile> {
  const payload: TradesFile = {
    updatedAt: new Date().toISOString(),
    trades,
  };
  await fs.mkdir(path.dirname(TRADES_PATH), { recursive: true });
  await fs.writeFile(TRADES_PATH, JSON.stringify(payload, null, 2), "utf8");
  return payload;
}

export async function GET() {
  const data = await readTradesFile();
  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "无效 JSON" }, { status: 400 });
  }

  const trades = Array.isArray(body)
    ? body
    : Array.isArray((body as { trades?: unknown }).trades)
      ? (body as { trades: Trade[] }).trades
      : null;

  if (!trades) {
    return NextResponse.json({ error: "需要 trades 数组" }, { status: 400 });
  }

  const data = await writeTradesFile(trades);
  return NextResponse.json(data);
}
