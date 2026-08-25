export type Board = "沪市主板" | "深市主板" | "创业板" | "科创板";
export type ListingStatus =
  | "已上市"
  | "待上市"
  | "已发行待上市"
  | "待申购"
  | "待发行";

export type IpoItem = {
  股票代码: string;
  股票简称: string;
  板块: Board;
  交易所: string;
  上市状态: ListingStatus;
  上市日期: string | null;
  申购日期: string | null;
  行业: string | null;
  发行价: number | null;
  发行总量_万股: number | null;
  网上发行_万股: number | null;
  发行后总股本_万股: number | null;
  募集资金_亿元: number | null;
  发行后总市值_亿元: number | null;
  发行流通值_亿元: number | null;
  首日开盘价: number | null;
  首日收盘价: number | null;
  首日最高价: number | null;
  首日最低价: number | null;
  次日日期: string | null;
  次日最高价: number | null;
  次日最低价: number | null;
  首日涨跌幅_pct: number | null;
  发行市盈率: number | null;
  保荐机构: string | null;
  主营业务: string | null;
  公司全称: string | null;
};

export type IpoPayload = {
  asOf: string;
  source: string;
  note: string;
  count: number;
  boards: Record<Board, number>;
  items: IpoItem[];
};

export const BOARDS: Board[] = ["沪市主板", "深市主板", "创业板", "科创板"];

export const STATUS_OPTIONS: Array<"全部" | ListingStatus> = [
  "全部",
  "已上市",
  "待上市",
  "已发行待上市",
  "待申购",
];

export function formatNumber(
  value: number | null | undefined,
  digits = 2,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString("zh-CN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatYi(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${formatNumber(value, 2)} 亿`;
}

export function formatDate(value: string | null | undefined): string {
  return value || "待公布";
}

export function sum(
  items: IpoItem[],
  key: keyof Pick<IpoItem, "募集资金_亿元" | "发行流通值_亿元">,
): number {
  return items.reduce((acc, item) => acc + (item[key] ?? 0), 0);
}

export const BOARD_STYLES: Record<Board, string> = {
  沪市主板: "bg-rose-50 text-rose-700 ring-rose-100",
  深市主板: "bg-sky-50 text-sky-700 ring-sky-100",
  创业板: "bg-teal-50 text-teal-700 ring-teal-100",
  科创板: "bg-violet-50 text-violet-700 ring-violet-100",
};

export type MarketGroup = "主板" | "创业板" | "科创板";

export function marketGroup(board: Board): MarketGroup {
  if (board === "科创板") return "科创板";
  if (board === "创业板") return "创业板";
  return "主板";
}

export function firstDayHigh(item: IpoItem): number | null {
  if (item.首日最高价 != null) return item.首日最高价;
  const prices = [item.首日开盘价, item.首日收盘价].filter(
    (value): value is number => value != null,
  );
  return prices.length ? Math.max(...prices) : null;
}

export function firstDayLow(item: IpoItem): number | null {
  if (item.首日最低价 != null) return item.首日最低价;
  const prices = [item.首日开盘价, item.首日收盘价].filter(
    (value): value is number => value != null,
  );
  return prices.length ? Math.min(...prices) : null;
}

/**
 * 理论最大收益率：首日最低价买入，次日最高价卖出。
 */
export function theoreticalMaxPct(item: IpoItem | null | undefined): number | null {
  if (!item) return null;
  const buy = firstDayLow(item);
  const sell = item.次日最高价;
  if (buy == null || buy <= 0 || sell == null) return null;
  return ((sell - buy) / buy) * 100;
}

/**
 * 理论最低收益率：首日最高价买入，次日最低价卖出。
 */
export function theoreticalMinPct(item: IpoItem | null | undefined): number | null {
  if (!item) return null;
  const buy = firstDayHigh(item);
  const sell = item.次日最低价;
  if (buy == null || buy <= 0 || sell == null) return null;
  return ((sell - buy) / buy) * 100;
}

export function formatYuan(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${formatNumber(value, digits)} 元`;
}

export function signedPct(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const abs = formatNumber(Math.abs(value), digits);
  if (value > 0) return `+${abs}%`;
  if (value < 0) return `-${abs}%`;
  return `${abs}%`;
}

export function changeClass(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) {
    return "text-muted-foreground";
  }
  return value > 0 ? "text-rose-600" : "text-emerald-600";
}

export const STATUS_STYLES: Record<ListingStatus, string> = {
  已上市: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  待上市: "bg-amber-50 text-amber-800 ring-amber-100",
  已发行待上市: "bg-orange-50 text-orange-800 ring-orange-100",
  待申购: "bg-slate-100 text-slate-700 ring-slate-200",
  待发行: "bg-slate-100 text-slate-500 ring-slate-200",
};
