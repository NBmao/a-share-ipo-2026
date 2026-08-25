import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/db";
import { readIpoPayload, seedIpoFromLocalIfEmpty } from "@/lib/ipo-store";
import { seedTradesFromLocalIfEmpty } from "@/lib/trades-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!hasDatabase()) {
      const data = await readIpoPayload();
      return NextResponse.json({
        backend: "local-json",
        count: data.count,
        asOf: data.asOf,
      });
    }
    const seededIpo = await seedIpoFromLocalIfEmpty();
    const seededTrades = await seedTradesFromLocalIfEmpty();
    const data = await readIpoPayload();
    return NextResponse.json({
      backend: "postgres",
      seededIpo,
      seededTrades,
      count: data.count,
      asOf: data.asOf,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "种子写入失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
