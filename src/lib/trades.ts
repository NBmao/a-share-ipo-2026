import {
  marketGroup,
  theoreticalMaxPct,
  theoreticalMinPct,
  type Board,
  type IpoItem,
} from "@/lib/ipo";

export const TRADES_FILE = "data/trades.json";

export type Trade = {
  id: string;
  code: string;
  name: string;
  board: Board;
  listingDate: string | null;
  buyPrice: number;
  shares: number;
  sellPrice: number | null;
  pnl: number;
  note: string;
  createdAt: string;
};

export function tradeCost(trade: Trade): number {
  return trade.buyPrice * trade.shares;
}

export function actualReturnPct(trade: Trade): number | null {
  const cost = tradeCost(trade);
  if (cost <= 0) return null;
  return (trade.pnl / cost) * 100;
}

export function createTradeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export type DimensionKey = "month" | "board" | "market" | "stock";

export type PnlBucket = {
  key: string;
  label: string;
  trades: number;
  cost: number;
  pnl: number;
  returnPct: number | null;
  wins: number;
};

function bucketFromTrades(key: string, label: string, trades: Trade[]): PnlBucket {
  const cost = trades.reduce((sum, trade) => sum + tradeCost(trade), 0);
  const pnl = trades.reduce((sum, trade) => sum + trade.pnl, 0);
  return {
    key,
    label,
    trades: trades.length,
    cost,
    pnl,
    returnPct: cost > 0 ? (pnl / cost) * 100 : null,
    wins: trades.filter((trade) => trade.pnl > 0).length,
  };
}

export function groupTrades(trades: Trade[], dimension: DimensionKey): PnlBucket[] {
  const groups = new Map<string, Trade[]>();
  for (const trade of trades) {
    let key = "未分类";
    if (dimension === "month") {
      key = trade.listingDate ? trade.listingDate.slice(0, 7) : "日期待公布";
    } else if (dimension === "board") {
      key = trade.board;
    } else if (dimension === "stock") {
      key = trade.code;
    } else {
      key = marketGroup(trade.board);
    }
    const list = groups.get(key) ?? [];
    list.push(trade);
    groups.set(key, list);
  }

  let keys: string[];
  if (dimension === "stock") {
    keys = [...groups.keys()].sort((a, b) => {
      const tradesA = groups.get(a) ?? [];
      const tradesB = groups.get(b) ?? [];
      const dateA =
        tradesA.map((t) => t.listingDate).filter(Boolean).sort()[0] ?? "9999-12-31";
      const dateB =
        tradesB.map((t) => t.listingDate).filter(Boolean).sort()[0] ?? "9999-12-31";
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return a.localeCompare(b);
    });
  } else {
    const order =
      dimension === "market"
        ? ["主板", "创业板", "科创板"]
        : dimension === "board"
          ? ["沪市主板", "深市主板", "创业板", "科创板"]
          : undefined;

    keys = order
      ? order.filter((key) => groups.has(key)).concat(
          [...groups.keys()].filter((key) => !order.includes(key)).sort(),
        )
      : [...groups.keys()].sort();
  }

  return keys.map((key) => {
    const list = groups.get(key) ?? [];
    let label = key;
    if (dimension === "month" && /^\d{4}-\d{2}$/.test(key)) {
      label = `${key.replace("-", "年")}月`;
    } else if (dimension === "stock") {
      const name = list[0]?.name ?? key;
      label = `${name} ${key}`;
    }
    return bucketFromTrades(key, label, list);
  });
}

export function totals(trades: Trade[]): PnlBucket {
  return bucketFromTrades("all", "合计", trades);
}

export type ChartRow = {
  code: string;
  name: string;
  listingDate: string;
  theoryMin: number | null;
  theoryMax: number | null;
  actual: number | null;
  traded: boolean;
};

export function chartRows(items: IpoItem[], trades: Trade[]): ChartRow[] {
  const byCode = new Map<string, Trade[]>();
  for (const trade of trades) {
    const list = byCode.get(trade.code) ?? [];
    list.push(trade);
    byCode.set(trade.code, list);
  }

  return items
    .filter(
      (item) =>
        item.上市日期 &&
        theoreticalMaxPct(item) != null &&
        theoreticalMinPct(item) != null,
    )
    .map((item) => {
      const mine = byCode.get(item.股票代码) ?? [];
      const cost = mine.reduce((sum, trade) => sum + tradeCost(trade), 0);
      const pnl = mine.reduce((sum, trade) => sum + trade.pnl, 0);
      return {
        code: item.股票代码,
        name: item.股票简称,
        listingDate: item.上市日期 ?? "",
        theoryMin: theoreticalMinPct(item),
        theoryMax: theoreticalMaxPct(item),
        actual: mine.length && cost > 0 ? (pnl / cost) * 100 : null,
        traded: mine.length > 0,
      };
    });
}
