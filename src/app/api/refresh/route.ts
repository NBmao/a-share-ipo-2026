import { NextResponse } from "next/server";
import { buildIpoPayload } from "@/lib/fetch-ipo";
import { writeIpoPayload } from "@/lib/ipo-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  try {
    const payload = await buildIpoPayload();
    await writeIpoPayload(payload);
    return NextResponse.json({
      ok: true,
      asOf: payload.asOf,
      count: payload.count,
      boards: payload.boards,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "刷新失败";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
