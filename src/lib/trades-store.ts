import { promises as fs } from "fs";
import path from "path";
import type { Trade } from "@/lib/trades";

export type TradesFile = {
  updatedAt: string | null;
  trades: Trade[];
};

const TRADES_PATH = path.join(process.cwd(), "data", "trades.json");
const GITHUB_PATH = "data/trades.json";

function githubConfig() {
  const token =
    process.env.TRADES_GITHUB_TOKEN ||
    process.env.GITHUB_TOKEN ||
    process.env.GH_TOKEN ||
    "";
  const repo =
    process.env.TRADES_GITHUB_REPO ||
    process.env.GITHUB_REPOSITORY ||
    "NBmao/a-share-ipo-2026";
  const branch = process.env.TRADES_GITHUB_BRANCH || "main";
  return { token, repo, branch, enabled: Boolean(token) };
}

function emptyFile(): TradesFile {
  return { updatedAt: null, trades: [] };
}

function parseTrades(raw: string): TradesFile {
  const parsed = JSON.parse(raw) as TradesFile | Trade[];
  if (Array.isArray(parsed)) return { updatedAt: null, trades: parsed };
  return {
    updatedAt: parsed.updatedAt ?? null,
    trades: Array.isArray(parsed.trades) ? parsed.trades : [],
  };
}

async function readLocal(): Promise<TradesFile> {
  try {
    const raw = await fs.readFile(TRADES_PATH, "utf8");
    return parseTrades(raw);
  } catch {
    return emptyFile();
  }
}

async function writeLocal(trades: Trade[]): Promise<TradesFile> {
  const payload: TradesFile = {
    updatedAt: new Date().toISOString(),
    trades,
  };
  await fs.mkdir(path.dirname(TRADES_PATH), { recursive: true });
  await fs.writeFile(TRADES_PATH, JSON.stringify(payload, null, 2), "utf8");
  return payload;
}

async function readGitHub(): Promise<TradesFile> {
  const { token, repo, branch } = githubConfig();
  const url = `https://api.github.com/repos/${repo}/contents/${GITHUB_PATH}?ref=${encodeURIComponent(branch)}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "a-share-ipo-2026",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });
  if (response.status === 404) return emptyFile();
  if (!response.ok) {
    throw new Error(`读取 GitHub 交易记录失败: ${response.status}`);
  }
  const data = (await response.json()) as { content?: string; encoding?: string };
  if (!data.content) return emptyFile();
  const raw = Buffer.from(data.content, "base64").toString("utf8");
  return parseTrades(raw);
}

async function writeGitHub(trades: Trade[]): Promise<TradesFile> {
  const { token, repo, branch } = githubConfig();
  const payload: TradesFile = {
    updatedAt: new Date().toISOString(),
    trades,
  };
  const metaUrl = `https://api.github.com/repos/${repo}/contents/${GITHUB_PATH}?ref=${encodeURIComponent(branch)}`;
  const metaResponse = await fetch(metaUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "a-share-ipo-2026",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });
  let sha: string | undefined;
  if (metaResponse.ok) {
    const meta = (await metaResponse.json()) as { sha?: string };
    sha = meta.sha;
  } else if (metaResponse.status !== 404) {
    throw new Error(`读取 GitHub 文件信息失败: ${metaResponse.status}`);
  }

  const putResponse = await fetch(
    `https://api.github.com/repos/${repo}/contents/${GITHUB_PATH}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "a-share-ipo-2026",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        message: `chore: update trades.json (${trades.length} trades)`,
        content: Buffer.from(JSON.stringify(payload, null, 2), "utf8").toString(
          "base64",
        ),
        branch,
        ...(sha ? { sha } : {}),
      }),
    },
  );
  if (!putResponse.ok) {
    const text = await putResponse.text();
    throw new Error(`写入 GitHub 交易记录失败: ${putResponse.status} ${text}`);
  }
  return payload;
}

export async function readTradesFile(): Promise<TradesFile> {
  return githubConfig().enabled ? readGitHub() : readLocal();
}

export async function writeTradesFile(trades: Trade[]): Promise<TradesFile> {
  return githubConfig().enabled ? writeGitHub(trades) : writeLocal(trades);
}
