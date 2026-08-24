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
  当前流通股本_万股: number | null;
  当前流通市值_亿元: number | null;
  当前总市值_亿元: number | null;
  最新价: number | null;
  涨跌幅_pct: number | null;
  首日开盘价: number | null;
  首日收盘价: number | null;
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
  key: keyof Pick<
    IpoItem,
    "募集资金_亿元" | "发行流通值_亿元" | "当前流通市值_亿元"
  >,
): number {
  return items.reduce((acc, item) => acc + (item[key] ?? 0), 0);
}

export const BOARD_STYLES: Record<Board, string> = {
  沪市主板: "bg-rose-50 text-rose-700 ring-rose-100",
  深市主板: "bg-sky-50 text-sky-700 ring-sky-100",
  创业板: "bg-teal-50 text-teal-700 ring-teal-100",
  科创板: "bg-violet-50 text-violet-700 ring-violet-100",
};

export const STATUS_STYLES: Record<ListingStatus, string> = {
  已上市: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  待上市: "bg-amber-50 text-amber-800 ring-amber-100",
  已发行待上市: "bg-orange-50 text-orange-800 ring-orange-100",
  待申购: "bg-slate-100 text-slate-700 ring-slate-200",
  待发行: "bg-slate-100 text-slate-500 ring-slate-200",
};
