import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { changePassword } from "@/lib/auth-store";
import { COOKIE_NAME, verifySessionToken } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  const jar = await cookies();
  const session = await verifySessionToken(jar.get(COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = (await request.json()) as {
      currentPassword?: string;
      newPassword?: string;
    };
  } catch {
    return NextResponse.json({ error: "无效 JSON" }, { status: 400 });
  }

  const result = await changePassword(
    body.currentPassword ?? "",
    body.newPassword ?? "",
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
