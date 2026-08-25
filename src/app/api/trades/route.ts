import { NextResponse } from "next/server";
import type { Trade } from "@/lib/trades";
import { readTradesFile, writeTradesFile } from "@/lib/trades-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await readTradesFile();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "读取失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
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

  try {
    const data = await writeTradesFile(trades);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
