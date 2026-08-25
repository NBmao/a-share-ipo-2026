import type { Board, IpoItem, IpoPayload, ListingStatus } from "@/lib/ipo";
import { BOARDS } from "@/lib/ipo";

type EmRow = Record<string, unknown>;
type DayBar = {
  day: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function todayIso(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === "" || value === "-") {
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function roundOrNone(value: number | null, digits: number): number | null {
  if (value == null) return null;
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

function parseDate(value: unknown): string | null {
  if (!value) return null;
  return String(value).slice(0, 10);
}

function boardOf(code: string): Board | null {
  if (code.startsWith("688")) return "科创板";
  if (code.startsWith("300") || code.startsWith("301")) return "创业板";
  if (
    code.startsWith("600") ||
    code.startsWith("601") ||
    code.startsWith("603") ||
    code.startsWith("605")
  ) {
    return "沪市主板";
  }
  if (
    code.startsWith("000") ||
    code.startsWith("001") ||
    code.startsWith("002") ||
    code.startsWith("003")
  ) {
    return "深市主板";
  }
  return null;
}

function exchangeOf(code: string): string {
  return code.startsWith("6") || code.startsWith("9") ? "上交所" : "深交所";
}

function listingStatus(
  listingDate: string | null,
  issuePrice: number | null,
  applyDate: string | null,
  asOf: string,
): ListingStatus {
  if (listingDate) return listingDate <= asOf ? "已上市" : "待上市";
  if (applyDate && applyDate > asOf) return "待申购";
  if (issuePrice) return "已发行待上市";
  return "待发行";
}

async function getJson(url: string, referer: string, retries = 4): Promise<unknown> {
  let lastErr: unknown;
  for (let i = 0; i < retries; i += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": UA,
          Referer: referer,
        },
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      lastErr = error;
      await sleep(400 * (i + 1));
    }
  }
  throw new Error(`GET failed: ${url} (${String(lastErr)})`);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchIpoPages(filterExpr: string): Promise<EmRow[]> {
  const items: EmRow[] = [];
  for (let page = 1; page <= 12; page += 1) {
    const params = new URLSearchParams({
      sortColumns: "LISTING_DATE,SECURITY_CODE",
      sortTypes: "-1,-1",
      pageSize: "50",
      pageNumber: String(page),
      reportName: "RPTA_APP_IPOAPPLY",
      columns: "ALL",
      source: "WEB",
      client: "WEB",
      filter: filterExpr,
    });
    const url = `https://datacenter-web.eastmoney.com/api/data/v1/get?${params}`;
    const payload = (await getJson(
      url,
      "https://data.eastmoney.com/xg/xg.html",
    )) as {
      result?: { data?: EmRow[]; pages?: number };
    };
    const chunk = payload.result?.data ?? [];
    items.push(...chunk);
    const pages = Number(payload.result?.pages ?? 1);
    if (page >= pages || chunk.length === 0) break;
  }
  return items;
}

function sinaSymbol(code: string): string {
  return `${code.startsWith("6") ? "sh" : "sz"}${code}`;
}

async function fetchDayBars(code: string, datalen = 320): Promise<DayBar[]> {
  const url =
    "https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/" +
    `CN_MarketData.getKLineData?symbol=${sinaSymbol(code)}&scale=240&ma=no&datalen=${datalen}`;
  try {
    const raw = await getJson(url, "https://finance.sina.com.cn/", 3);
    if (!Array.isArray(raw)) return [];
    return raw.map((row) => {
      const item = row as Record<string, unknown>;
      return {
        day: String(item.day ?? ""),
        open: num(item.open),
        high: num(item.high),
        low: num(item.low),
        close: num(item.close),
      };
    });
  } catch {
    return [];
  }
}

function firstTwoSessions(
  bars: DayBar[],
  listingDate: string | null,
): [DayBar | null, DayBar | null] {
  if (!listingDate || !bars.length) return [null, null];
  let idx = bars.findIndex((bar) => bar.day === listingDate);
  if (idx < 0) {
    idx = bars.findIndex((bar) => bar.day >= listingDate);
  }
  if (idx < 0) return [null, null];
  return [bars[idx] ?? null, bars[idx + 1] ?? null];
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index]!);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => run()),
  );
  return results;
}

export async function buildIpoPayload(now = new Date()): Promise<IpoPayload> {
  const asOf = todayIso(now);
  const byCode = new Map<string, EmRow>();
  for (const filter of ["(LISTING_DATE>='2026-01-01')", "(APPLY_DATE>='2026-01-01')"]) {
    for (const row of await fetchIpoPages(filter)) {
      const code = String(row.SECURITY_CODE ?? "");
      if (code) byCode.set(code, row);
    }
  }

  const stocks = [...byCode.entries()]
    .filter(([code]) => boardOf(code))
    .map(([, row]) => row);

  const listedCodes = stocks
    .map((row) => {
      const code = String(row.SECURITY_CODE ?? "");
      const listingDate = parseDate(row.LISTING_DATE);
      return { code, listingDate };
    })
    .filter(
      (item): item is { code: string; listingDate: string } =>
        Boolean(item.code && item.listingDate && item.listingDate <= asOf),
    );

  const dayBarsEntries = await mapPool(listedCodes, 8, async ({ code }) => {
    const bars = await fetchDayBars(code);
    return [code, bars] as const;
  });
  const dayBars = new Map<string, DayBar[]>(dayBarsEntries);

  const records: IpoItem[] = [];
  for (const row of stocks) {
    const code = String(row.SECURITY_CODE ?? "");
    const board = boardOf(code);
    if (!board) continue;

    const listingDate = parseDate(row.LISTING_DATE);
    const applyDate = parseDate(row.APPLY_DATE);
    const issuePrice = num(row.ISSUE_PRICE);
    const issueNumWan = num(row.ISSUE_NUM);
    const onlineShares = num(row.ONLINE_ISSUE_NUM);
    const totalShares = num(row.TOTAL_SHARES);

    let raiseYi: number | null;
    if (issuePrice) {
      raiseYi = num(row.DEC_SUMFINA) ?? num(row.TOTAL_RAISE_FUNDS);
      if (raiseYi == null && issueNumWan) {
        raiseYi = (issuePrice * issueNumWan) / 10000;
      }
    } else {
      raiseYi = num(row.PREDICT_RAISE_FUNDS);
    }

    const onlineWan = onlineShares != null ? onlineShares / 10000 : null;
    const totalSharesWan = totalShares != null ? totalShares / 10000 : null;
    const issueMarketYi =
      issuePrice != null && totalShares != null
        ? (issuePrice * totalShares) / 1e8
        : null;
    let issueFloatYi =
      issuePrice != null && onlineShares != null
        ? (issuePrice * onlineShares) / 1e8
        : null;
    if (issueFloatYi == null && issuePrice != null && issueNumWan != null) {
      issueFloatYi = (issuePrice * issueNumWan) / 10000;
    }

    let firstOpen = num(row.OPEN_PRICE);
    let firstClose = num(row.CLOSE_PRICE);
    let firstHigh: number | null = null;
    let firstLow: number | null = null;
    const [day1, day2] = firstTwoSessions(dayBars.get(code) ?? [], listingDate);
    if (day1) {
      firstOpen = day1.open ?? firstOpen;
      firstClose = day1.close ?? firstClose;
      firstHigh = day1.high;
      firstLow = day1.low;
    } else {
      const highChg = num(row.LD_HIGH_CHANG);
      firstHigh =
        issuePrice != null && highChg != null
          ? issuePrice * (1 + highChg / 100)
          : null;
      if (firstHigh == null) {
        const dayPrices = [firstOpen, firstClose].filter(
          (value): value is number => value != null,
        );
        firstHigh = dayPrices.length ? Math.max(...dayPrices) : null;
      }
      const lows = [firstOpen, firstClose].filter(
        (value): value is number => value != null,
      );
      firstLow = lows.length ? Math.min(...lows) : null;
    }

    records.push({
      股票代码: code,
      股票简称: String(row.SECURITY_NAME_ABBR ?? row.SECURITY_NAME ?? ""),
      板块: board,
      交易所: exchangeOf(code),
      上市状态: listingStatus(listingDate, issuePrice, applyDate, asOf),
      上市日期: listingDate,
      申购日期: applyDate,
      次日日期: day2?.day ?? null,
      行业: row.INDUSTRY_NAME == null ? null : String(row.INDUSTRY_NAME),
      发行价: roundOrNone(issuePrice, 2),
      发行总量_万股: roundOrNone(issueNumWan, 2),
      网上发行_万股: roundOrNone(onlineWan, 2),
      发行后总股本_万股: roundOrNone(totalSharesWan, 2),
      募集资金_亿元: roundOrNone(raiseYi, 4),
      发行后总市值_亿元: roundOrNone(issueMarketYi, 4),
      发行流通值_亿元: roundOrNone(issueFloatYi, 4),
      首日开盘价: roundOrNone(firstOpen, 2),
      首日收盘价: roundOrNone(firstClose, 2),
      首日最高价: roundOrNone(firstHigh, 2),
      首日最低价: roundOrNone(firstLow, 2),
      次日最高价: roundOrNone(day2?.high ?? null, 2),
      次日最低价: roundOrNone(day2?.low ?? null, 2),
      首日涨跌幅_pct: roundOrNone(num(row.LD_CLOSE_CHANGE), 2),
      发行市盈率: roundOrNone(num(row.AFTER_ISSUE_PE), 2),
      保荐机构: row.RECOMMEND_ORG == null ? null : String(row.RECOMMEND_ORG),
      主营业务: row.MAIN_BUSINESS == null ? null : String(row.MAIN_BUSINESS),
      公司全称:
        row.SECURITY_NAME_FULL == null ? null : String(row.SECURITY_NAME_FULL),
    });
  }

  records.sort((a, b) => {
    const listingA = a.上市日期 ?? "9999-12-31";
    const listingB = b.上市日期 ?? "9999-12-31";
    if (listingA !== listingB) return listingA.localeCompare(listingB);
    const applyA = a.申购日期 ?? "9999-12-31";
    const applyB = b.申购日期 ?? "9999-12-31";
    if (applyA !== applyB) return applyA.localeCompare(applyB);
    return a.股票代码.localeCompare(b.股票代码);
  });

  const boards = Object.fromEntries(
    BOARDS.map((board) => [board, records.filter((item) => item.板块 === board).length]),
  ) as Record<Board, number>;

  return {
    asOf,
    source: "东方财富新股申购接口 RPTA_APP_IPOAPPLY + 新浪日K（首日/次日高低价）",
    note: "发行流通值 = 网上发行股数 × 发行价（亿元）。无网上发行数据时回退为发行总量 × 发行价。北交所已排除。不含实时行情字段。",
    count: records.length,
    boards,
    items: records,
  };
}
