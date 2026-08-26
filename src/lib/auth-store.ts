import { promises as fs } from "fs";
import path from "path";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";

const AUTH_PATH = path.join(process.cwd(), "data", "auth.json");
const DEFAULT_USER = "admin";
const DEFAULT_PASS = "admin";

type AuthFile = {
  username: string;
  passwordHash: string;
  updatedAt: string;
};

async function readLocal(): Promise<AuthFile> {
  try {
    const raw = await fs.readFile(AUTH_PATH, "utf8");
    return JSON.parse(raw) as AuthFile;
  } catch {
    const seeded: AuthFile = {
      username: DEFAULT_USER,
      passwordHash: hashPassword(DEFAULT_PASS),
      updatedAt: new Date().toISOString(),
    };
    await fs.mkdir(path.dirname(AUTH_PATH), { recursive: true });
    await fs.writeFile(AUTH_PATH, JSON.stringify(seeded, null, 2), "utf8");
    return seeded;
  }
}

async function writeLocal(passwordHash: string): Promise<void> {
  const payload: AuthFile = {
    username: DEFAULT_USER,
    passwordHash,
    updatedAt: new Date().toISOString(),
  };
  await fs.mkdir(path.dirname(AUTH_PATH), { recursive: true });
  await fs.writeFile(AUTH_PATH, JSON.stringify(payload, null, 2), "utf8");
}

async function ensureDbAuth() {
  await ensureSchema();
  const db = sql();
  await db`
    CREATE TABLE IF NOT EXISTS app_auth (
      username TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  const rows = await db`
    SELECT username FROM app_auth WHERE username = ${DEFAULT_USER}
  `;
  if (!rows.length) {
    await db`
      INSERT INTO app_auth (username, password_hash, updated_at)
      VALUES (${DEFAULT_USER}, ${hashPassword(DEFAULT_PASS)}, NOW())
    `;
  }
}

async function readDb(): Promise<AuthFile> {
  await ensureDbAuth();
  const db = sql();
  const rows = await db`
    SELECT username, password_hash, updated_at
    FROM app_auth
    WHERE username = ${DEFAULT_USER}
  `;
  const row = rows[0] as {
    username: string;
    password_hash: string;
    updated_at: Date | string;
  };
  return {
    username: row.username,
    passwordHash: row.password_hash,
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

async function writeDb(passwordHash: string): Promise<void> {
  await ensureDbAuth();
  const db = sql();
  await db`
    UPDATE app_auth
    SET password_hash = ${passwordHash}, updated_at = NOW()
    WHERE username = ${DEFAULT_USER}
  `;
}

export async function verifyLogin(
  username: string,
  password: string,
): Promise<boolean> {
  if (username !== DEFAULT_USER) return false;
  const auth = hasDatabase() ? await readDb() : await readLocal();
  return verifyPassword(password, auth.passwordHash);
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (newPassword.length < 4) {
    return { ok: false, error: "新密码至少 4 位" };
  }
  const auth = hasDatabase() ? await readDb() : await readLocal();
  if (!verifyPassword(currentPassword, auth.passwordHash)) {
    return { ok: false, error: "当前密码不正确" };
  }
  const next = hashPassword(newPassword);
  if (hasDatabase()) {
    await writeDb(next);
  } else {
    await writeLocal(next);
  }
  return { ok: true };
}
