import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyLogin } from "@/lib/auth-store";
import {
  clearSessionCookieOptions,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { username?: string; password?: string };
  try {
    body = (await request.json()) as { username?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "无效 JSON" }, { status: 400 });
  }

  const username = body.username?.trim() ?? "";
  const password = body.password ?? "";
  if (!username || !password) {
    return NextResponse.json({ error: "请输入用户名和密码" }, { status: 400 });
  }

  const ok = await verifyLogin(username, password);
  if (!ok) {
    return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
  }

  const token = await createSessionToken(username);
  const jar = await cookies();
  const opts = sessionCookieOptions(token);
  jar.set(opts.name, opts.value, {
    httpOnly: opts.httpOnly,
    secure: opts.secure,
    sameSite: opts.sameSite,
    path: opts.path,
    maxAge: opts.maxAge,
  });

  return NextResponse.json({ ok: true, username });
}

export async function DELETE() {
  const jar = await cookies();
  const opts = clearSessionCookieOptions();
  jar.set(opts.name, opts.value, {
    httpOnly: opts.httpOnly,
    secure: opts.secure,
    sameSite: opts.sameSite,
    path: opts.path,
    maxAge: opts.maxAge,
  });
  return NextResponse.json({ ok: true });
}
