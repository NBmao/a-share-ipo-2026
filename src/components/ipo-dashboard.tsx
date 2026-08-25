"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Search,
  TrendingUp,
  Wallet,
  CalendarDays,
  NotebookPen,
  ChartColumn,
  RefreshCw,
} from "lucide-react";
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
import { PnlSummary } from "@/components/pnl-summary";
import { TradeJournal } from "@/components/trade-journal";
import { useTrades } from "@/hooks/use-trades";
import {
  BOARD_STYLES,
  BOARDS,
  STATUS_OPTIONS,
  STATUS_STYLES,
  formatDate,
  formatNumber,
  formatYi,
  signedPct,
  sum,
  type Board,
  type IpoItem,
  type IpoPayload,
  type ListingStatus,
} from "@/lib/ipo";
import { cn } from "@/lib/utils";

type Props = { data: IpoPayload };
type AppTab = "list" | "journal" | "summary";

export function IpoDashboard({ data }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<AppTab>("list");
  const [query, setQuery] = useState("");
  const [board, setBoard] = useState<"全部" | Board>("全部");
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>("全部");
  const [selected, setSelected] = useState<IpoItem | null>(null);
  const [prefillCode, setPrefillCode] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const { trades, upsert, remove, error: tradesError } = useTrades();

  async function refreshIpoData() {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshMessage(null);
    try {
      const response = await fetch("/api/refresh", { method: "POST" });
      const body = (await response.json()) as {
        ok?: boolean;
        asOf?: string;
        count?: number;
        error?: string;
      };
      if (!response.ok || !body.ok) {
        throw new Error(body.error || "刷新失败");
      }
      setRefreshMessage(`已更新至 ${body.asOf}，共 ${body.count} 只`);
      router.refresh();
    } catch (error) {
      setRefreshMessage(
        error instanceof Error ? error.message : "刷新失败，请稍后重试",
      );
    } finally {
      setRefreshing(false);
    }
  }

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
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-5 sm:gap-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2 sm:space-y-3">
              <p className="text-[11px] font-medium tracking-[0.18em] text-sky-200/80 uppercase sm:text-xs sm:tracking-[0.22em]">
                2026 A-SHARE IPO
              </p>
              <h1 className="text-xl font-semibold tracking-tight sm:text-3xl">
                主板 / 创业板 / 科创板新股
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-300">
                按上市日期排序，可记账与汇总。数据截至{" "}
                <span className="font-medium text-white">{data.asOf}</span>
                ，不含北交所。
              </p>
              {refreshMessage ? (
                <p className="text-xs text-sky-100/90">{refreshMessage}</p>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
              <Button
                type="button"
                size="lg"
                variant="outline"
                disabled={refreshing}
                onClick={() => void refreshIpoData()}
                className="h-11 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
                {refreshing ? "刷新中…" : "刷新数据"}
              </Button>
              <a
                href="/ipo-2026.xlsx"
                download="2026新股_按上市日期.xlsx"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-11 bg-white text-[#0f2744] hover:bg-sky-50",
                )}
              >
                <Download />
                下载 Excel
              </a>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
            <Stat
              icon={<CalendarDays className="size-4" />}
              label="新股只数"
              value={`${data.count} 只`}
              hint={`已上市 ${listed.length} · 待定 ${data.count - listed.length}`}
            />
            <Stat
              icon={<Wallet className="size-4" />}
              label="已定价募集"
              value={`${formatNumber(raiseTotal, 1)} 亿`}
              hint="有发行价公司合计"
            />
            <Stat
              icon={<TrendingUp className="size-4" />}
              label="发行流通值"
              value={`${formatNumber(floatTotal, 1)} 亿`}
              hint="网上发行 × 发行价"
            />
            <Stat
              label="分板块"
              value={`${data.boards["沪市主板"] + data.boards["深市主板"]} / ${data.boards["创业板"]} / ${data.boards["科创板"]}`}
              hint="主板 / 创业 / 科创"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-3 px-3 py-4 sm:gap-4 sm:px-6 sm:py-6 lg:px-8">
        <div
          role="tablist"
          aria-label="功能页签"
          className="sticky top-0 z-20 -mx-3 flex w-[calc(100%+1.5rem)] gap-1 bg-[#f3f6fa]/95 px-3 py-2 backdrop-blur sm:relative sm:mx-0 sm:w-full sm:rounded-lg sm:bg-white sm:p-1 sm:shadow-sm sm:ring-1 sm:ring-foreground/10 sm:backdrop-blur-none"
        >
          {(
            [
              { id: "list", label: "新股列表", short: "列表", icon: Search },
              { id: "journal", label: "交易记账", short: "记账", icon: NotebookPen },
              { id: "summary", label: "收益汇总", short: "汇总", icon: ChartColumn },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setSelected(null);
                  setTab(item.id);
                  setRefreshMessage(null);
                }}
                className={cn(
                  "relative z-10 inline-flex h-11 min-h-11 flex-1 items-center justify-center gap-1.5 rounded-md px-2 text-sm font-medium transition-colors sm:h-9 sm:min-h-9 sm:px-3 [&_svg]:pointer-events-none",
                  active
                    ? "bg-[#0f2744] text-white shadow-sm"
                    : "bg-white text-muted-foreground shadow-sm ring-1 ring-foreground/10 hover:bg-muted hover:text-foreground sm:bg-transparent sm:shadow-none sm:ring-0",
                )}
              >
                <Icon className="size-3.5" aria-hidden />
                <span className="sm:hidden">{item.short}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            );
          })}
        </div>

        {tab === "list" ? (
        <div className="flex flex-col gap-4">
        <Card className="bg-white/80 shadow-sm">
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-sm">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索代码、简称、行业或公司全称"
                  className="h-11 pl-8 text-base sm:h-8 sm:text-sm"
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </>
        )}
        </div>
        ) : null}

        {tab === "journal" ? (
          <div className="flex flex-col gap-3">
            {tradesError ? (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {tradesError}
              </p>
            ) : null}
            <TradeJournal
              items={data.items}
              trades={trades}
              prefillCode={prefillCode}
              onPrefillConsumed={() => setPrefillCode(null)}
              onSave={upsert}
              onDelete={remove}
            />
          </div>
        ) : null}

        {tab === "summary" ? (
            <PnlSummary items={data.items} trades={trades} />
        ) : null}

        <p className="pb-6 text-xs leading-5 text-muted-foreground">
          {data.note} 交易与新股数据优先存 Neon Postgres；本地无数据库时回退到 data/*.json。理论最高 =（次日最高 − 首日最低）/ 首日最低；理论最低 =（次日最低 − 首日最高）/ 首日最高；实际收益率 = 次日收益 /（买入价 × 股数）。
        </p>
      </main>

      {selected ? (
        <Sheet
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
        >
          <SheetContent
            side="right"
            className="w-full max-w-full gap-0 overflow-y-auto p-0 sm:max-w-md"
          >
            <IpoDetail
              item={selected}
              onRecord={() => {
                setPrefillCode(selected.股票代码);
                setSelected(null);
                setTab("journal");
              }}
            />
          </SheetContent>
        </Sheet>
      ) : null}
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
    <div className="rounded-xl bg-white/8 p-3 ring-1 ring-white/10 sm:p-4">
      <div className="flex items-center gap-1.5 text-[11px] text-sky-100/80 sm:gap-2 sm:text-xs">
        {icon}
        {label}
      </div>
      <p className="mt-1.5 text-base font-semibold tracking-tight sm:mt-2 sm:text-xl">
        {value}
      </p>
      <p className="mt-1 text-[11px] leading-4 text-slate-300 sm:text-xs">{hint}</p>
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
    <div className="flex flex-col gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {options.map((option) => (
          <Button
            key={option}
            type="button"
            size="sm"
            variant={value === option ? "default" : "outline"}
            onClick={() => onChange(option)}
            className="h-9 shrink-0"
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

function IpoDetail({
  item,
  onRecord,
}: {
  item: IpoItem;
  onRecord: () => void;
}) {
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
    ["首日开盘价", item.首日开盘价 ? `${formatNumber(item.首日开盘价)} 元` : "—"],
    ["首日收盘价", item.首日收盘价 ? `${formatNumber(item.首日收盘价)} 元` : "—"],
    ["首日最高价", item.首日最高价 ? `${formatNumber(item.首日最高价)} 元` : "—"],
    ["首日最低价", item.首日最低价 ? `${formatNumber(item.首日最低价)} 元` : "—"],
    ["次日日期", formatDate(item.次日日期)],
    ["次日最高价", item.次日最高价 ? `${formatNumber(item.次日最高价)} 元` : "—"],
    ["次日最低价", item.次日最低价 ? `${formatNumber(item.次日最低价)} 元` : "—"],
    ["首日涨跌幅", signedPct(item.首日涨跌幅_pct)],
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
        <Button type="button" className="mt-2" onClick={onRecord}>
          记一笔首日买入
        </Button>
      </div>
    </>
  );
}
