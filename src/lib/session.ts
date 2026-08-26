const COOKIE_NAME = "ipo_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 7;

type SessionPayload = {
  u: string;
  exp: number;
};

function authSecret(): string {
  return (
    process.env.AUTH_SECRET ||
    process.env.VERCEL_OIDC_TOKEN?.slice(0, 32) ||
    "dev-only-set-AUTH_SECRET-in-production"
  );
}

async function hmacKey() {
  const secret = authSecret();
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function encodePayload(payload: SessionPayload): string {
  return btoa(JSON.stringify(payload));
}

function decodePayload(raw: string): SessionPayload | null {
  try {
    const parsed = JSON.parse(atob(raw)) as SessionPayload;
    if (!parsed.u || typeof parsed.exp !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function createSessionToken(username: string): Promise<string> {
  const payload: SessionPayload = {
    u: username,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SEC,
  };
  const body = encodePayload(payload);
  const key = await hmacKey();
  const sigBuf = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body),
  );
  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${body}.${sig}`;
}

export async function verifySessionToken(
  token: string | undefined | null,
): Promise<{ username: string } | null> {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const key = await hmacKey();
  const expected = btoa(
    String.fromCharCode(
      ...new Uint8Array(
        await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)),
      ),
    ),
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  if (sig !== expected) return null;
  const payload = decodePayload(body);
  if (!payload) return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return { username: payload.u };
}

export function sessionCookieOptions(token: string) {
  const secure = process.env.NODE_ENV === "production";
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_SEC,
  };
}

export function clearSessionCookieOptions() {
  const secure = process.env.NODE_ENV === "production";
  return {
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}

export { COOKIE_NAME };
