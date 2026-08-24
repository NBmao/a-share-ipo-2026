"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Download, Search, TrendingUp, Wallet, CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BOARD_STYLES,
  BOARDS,
  STATUS_OPTIONS,
  STATUS_STYLES,
  formatDate,
  formatNumber,
  formatYi,
  sum,
  type Board,
  type IpoItem,
  type IpoPayload,
  type ListingStatus,
} from "@/lib/ipo";
import { cn } from "@/lib/utils";

type Props = { data: IpoPayload };

function changeClass(value: number | null): string {
  if (value === null || value === 0) return "text-muted-foreground";
  return value > 0 ? "text-rose-600" : "text-emerald-600";
}

function signed(value: number | null, digits = 2): string {
  if (value === null) return "—";
  const abs = formatNumber(Math.abs(value), digits);
  if (value > 0) return `+${abs}`;
  if (value < 0) return `-${abs}`;
  return abs;
}

export function IpoDashboard({ data }: Props) {
  const [query, setQuery] = useState("");
  const [board, setBoard] = useState<"全部" | Board>("全部");
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>("全部");
  const [selected, setSelected] = useState<IpoItem | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.items.filter((item) => {
      if (board !== "全部" && item.板块 !== board) return false;
      if (status !== "全部" && item.上市状态 !== status) return false;
      if (!q) return true;
      return (
        item.股票代码.includes(q) ||
        item.股票简称.toLowerCase().includes(q) ||
        (item.公司全称 ?? "").toLowerCase().includes(q) ||
        (item.行业 ?? "").toLowerCase().includes(q)
      );
    });
  }, [board, data.items, query, status]);

  const listed = data.items.filter((item) => item.上市状态 === "已上市");
  const raiseTotal = sum(
    data.items.filter((item) => item.发行价 !== null),
    "募集资金_亿元",
  );
  const floatTotal = sum(
    data.items.filter((item) => item.发行流通值_亿元 !== null),
    "发行流通值_亿元",
  );

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-white/10 bg-[#0f2744] text-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="text-xs font-medium tracking-[0.22em] text-sky-200/80 uppercase">
                2026 A-SHARE IPO
              </p>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                主板 / 创业板 / 科创板新股
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-300">
                按上市日期排序，已补齐股票代码、发行价、发行量与发行流通值。
                发行流通值 = 网上发行股数 × 发行价。数据截至 {data.asOf}，不含北交所。
              </p>
            </div>
            <a
              href="/ipo-2026.xlsx"
              download="2026新股_按上市日期.xlsx"
              className={cn(
                buttonVariants({ size: "lg" }),
                "bg-white text-[#0f2744] hover:bg-sky-50",
              )}
            >
              <Download />
              下载 Excel
            </a>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              icon={<CalendarDays className="size-4" />}
              label="新股只数"
              value={`${data.count} 只`}
              hint={`已上市 ${listed.length} · 待上市/待申购 ${data.count - listed.length}`}
            />
            <Stat
              icon={<Wallet className="size-4" />}
              label="已定价募集资金"
              value={`${formatNumber(raiseTotal, 1)} 亿`}
              hint="有发行价的公司合计"
            />
            <Stat
              icon={<TrendingUp className="size-4" />}
              label="发行流通值合计"
              value={`${formatNumber(floatTotal, 1)} 亿`}
              hint="网上发行 × 发行价"
            />
            <Stat
              label="分板块"
              value={`${data.boards["沪市主板"] + data.boards["深市主板"]} / ${data.boards["创业板"]} / ${data.boards["科创板"]}`}
              hint="主板 / 创业板 / 科创板"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
        <Card className="bg-white/80 shadow-sm">
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-sm">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索代码、简称、行业或公司全称"
                  className="pl-8"
                  aria-label="搜索新股"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                当前显示 {filtered.length} / {data.count} 只
              </p>
            </div>
            <FilterRow
              label="板块"
              value={board}
              options={["全部", ...BOARDS]}
              onChange={setBoard}
            />
            <FilterRow
              label="状态"
              value={status}
              options={STATUS_OPTIONS}
              onChange={setStatus}
            />
          </CardContent>
        </Card>

        {filtered.length === 0 ? (
          <EmptyState
            query={query}
            onReset={() => {
              setQuery("");
              setBoard("全部");
              setStatus("全部");
            }}
          />
        ) : (
          <>
            <div className="grid gap-3 md:hidden">
              {filtered.map((item) => (
                <button
                  key={item.股票代码}
                  type="button"
                  onClick={() => setSelected(item)}
                  className="rounded-xl bg-white p-4 text-left shadow-sm ring-1 ring-foreground/10"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold">{item.股票简称}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {item.股票代码}
                      </p>
                    </div>
                    <BoardBadge board={item.板块} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <Field label="上市日期" value={formatDate(item.上市日期)} />
                    <Field label="发行价" value={item.发行价 ? `${formatNumber(item.发行价)} 元` : "待定价"} />
                    <Field label="发行流通值" value={formatYi(item.发行流通值_亿元)} />
                    <Field label="募集资金" value={formatYi(item.募集资金_亿元)} />
                  </div>
                  <div className="mt-3">
                    <StatusBadge status={item.上市状态} />
                  </div>
                </button>
              ))}
            </div>

            <Card className="hidden overflow-hidden bg-white py-0 shadow-sm md:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead>上市日期</TableHead>
                    <TableHead>代码 / 简称</TableHead>
                    <TableHead>板块</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">发行价</TableHead>
                    <TableHead className="text-right">发行量</TableHead>
                    <TableHead className="text-right">发行流通值</TableHead>
                    <TableHead className="text-right">募集资金</TableHead>
                    <TableHead className="text-right">流通市值</TableHead>
                    <TableHead className="text-right">最新价</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow
                      key={item.股票代码}
                      className="cursor-pointer"
                      onClick={() => setSelected(item)}
                    >
                      <TableCell className="font-medium">
                        {formatDate(item.上市日期)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{item.股票简称}</span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {item.股票代码}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <BoardBadge board={item.板块} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={item.上市状态} />
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {item.发行价 ? formatNumber(item.发行价) : "待定价"}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {item.发行总量_万股
                          ? `${formatNumber(item.发行总量_万股, 0)} 万`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums font-medium">
                        {formatYi(item.发行流通值_亿元)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatYi(item.募集资金_亿元)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatYi(item.当前流通市值_亿元)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-mono tabular-nums">
                            {item.最新价 ? formatNumber(item.最新价) : "—"}
                          </span>
                          <span
                            className={cn(
                              "font-mono text-xs tabular-nums",
                              changeClass(item.涨跌幅_pct),
                            )}
                          >
                            {item.涨跌幅_pct === null
                              ? ""
                              : `${signed(item.涨跌幅_pct)}%`}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </>
        )}

        <p className="pb-6 text-xs leading-5 text-muted-foreground">
          {data.note} 原始桌面文件未随仓库上传，本表按 2026 年公开新股数据重建。
          未定价新股的募集资金为招股预计值。点击一行可查看保荐机构与主营业务。
        </p>
      </main>

      <Sheet
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-md">
          {selected ? <IpoDetail item={selected} /> : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white/8 p-4 ring-1 ring-white/10">
      <div className="flex items-center gap-2 text-xs text-sky-100/80">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-slate-300">{hint}</p>
    </div>
  );
}

function FilterRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <span className="w-12 shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <Button
            key={option}
            type="button"
            size="sm"
            variant={value === option ? "default" : "outline"}
            onClick={() => onChange(option)}
          >
            {option}
          </Button>
        ))}
      </div>
    </div>
  );
}

function BoardBadge({ board }: { board: Board }) {
  return (
    <Badge variant="outline" className={cn("ring-1", BOARD_STYLES[board])}>
      {board}
    </Badge>
  );
}

function StatusBadge({ status }: { status: ListingStatus }) {
  return (
    <Badge variant="outline" className={cn("ring-1", STATUS_STYLES[status])}>
      {status}
    </Badge>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  );
}

function EmptyState({
  query,
  onReset,
}: {
  query: string;
  onReset: () => void;
}) {
  return (
    <Card className="bg-white py-12 text-center shadow-sm">
      <CardContent className="space-y-3">
        <p className="text-base font-medium">没有匹配的新股</p>
        <p className="text-sm text-muted-foreground">
          {query
            ? `找不到「${query}」。试试代码、简称，或清空筛选。`
            : "当前筛选条件下没有记录。"}
        </p>
        <Button variant="outline" onClick={onReset}>
          清空筛选
        </Button>
      </CardContent>
    </Card>
  );
}

function IpoDetail({ item }: { item: IpoItem }) {
  const rows: Array<[string, string]> = [
    ["股票代码", item.股票代码],
    ["公司全称", item.公司全称 ?? "—"],
    ["板块", item.板块],
    ["交易所", item.交易所],
    ["上市状态", item.上市状态],
    ["上市日期", formatDate(item.上市日期)],
    ["申购日期", formatDate(item.申购日期)],
    ["行业", item.行业 ?? "—"],
    ["发行价", item.发行价 ? `${formatNumber(item.发行价)} 元` : "待定价"],
    ["发行总量", item.发行总量_万股 ? `${formatNumber(item.发行总量_万股)} 万股` : "—"],
    ["网上发行", item.网上发行_万股 ? `${formatNumber(item.网上发行_万股)} 万股` : "—"],
    ["发行后总股本", item.发行后总股本_万股 ? `${formatNumber(item.发行后总股本_万股)} 万股` : "—"],
    ["募集资金", formatYi(item.募集资金_亿元)],
    ["发行后总市值", formatYi(item.发行后总市值_亿元)],
    ["发行流通值", formatYi(item.发行流通值_亿元)],
    ["当前流通股本", item.当前流通股本_万股 ? `${formatNumber(item.当前流通股本_万股)} 万股` : "—"],
    ["当前流通市值", formatYi(item.当前流通市值_亿元)],
    ["当前总市值", formatYi(item.当前总市值_亿元)],
    ["最新价", item.最新价 ? `${formatNumber(item.最新价)} 元` : "—"],
    ["涨跌幅", item.涨跌幅_pct === null ? "—" : `${signed(item.涨跌幅_pct)}%`],
    ["首日开盘价", item.首日开盘价 ? `${formatNumber(item.首日开盘价)} 元` : "—"],
    ["首日收盘价", item.首日收盘价 ? `${formatNumber(item.首日收盘价)} 元` : "—"],
    ["首日涨跌幅", item.首日涨跌幅_pct === null ? "—" : `${signed(item.首日涨跌幅_pct)}%`],
    ["发行市盈率", item.发行市盈率 ? `${formatNumber(item.发行市盈率)} 倍` : "—"],
    ["保荐机构", item.保荐机构 ?? "—"],
  ];

  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          {item.股票简称}
          <span className="font-mono text-sm font-normal text-muted-foreground">
            {item.股票代码}
          </span>
        </SheetTitle>
        <SheetDescription>
          发行流通值按网上发行股份 × 发行价计算
        </SheetDescription>
      </SheetHeader>
      <div className="flex flex-wrap gap-2 px-4">
        <BoardBadge board={item.板块} />
        <StatusBadge status={item.上市状态} />
      </div>
      <div className="grid grid-cols-1 gap-3 overflow-y-auto px-4 pb-6">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-4 border-b border-border/70 py-2">
            <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
            <span className="text-right text-sm leading-6">{value}</span>
          </div>
        ))}
        {item.主营业务 ? (
          <div className="rounded-lg bg-muted/60 p-3">
            <p className="text-xs text-muted-foreground">主营业务</p>
            <p className="mt-1 text-sm leading-6">{item.主营业务}</p>
          </div>
        ) : null}
      </div>
    </>
  );
}
