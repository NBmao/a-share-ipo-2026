"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  changeClass,
  formatNumber,
  formatYuan,
  signedPct,
  type IpoItem,
} from "@/lib/ipo";
import {
  chartRows,
  groupTrades,
  totals,
  type DimensionKey,
  type Trade,
} from "@/lib/trades";
import { cn } from "@/lib/utils";

type Props = { items: IpoItem[]; trades: Trade[] };

const DIMENSIONS: Array<{ key: DimensionKey; label: string }> = [
  { key: "month", label: "按月" },
  { key: "market", label: "主板 / 创业板 / 科创板" },
  { key: "board", label: "按板块" },
];

export function PnlSummary({ items, trades }: Props) {
  const [dimension, setDimension] = useState<DimensionKey>("month");
  const summary = useMemo(() => totals(trades), [trades]);
  const buckets = useMemo(() => groupTrades(trades, dimension), [dimension, trades]);
  const rows = useMemo(() => chartRows(items, trades), [items, trades]);
  const chartData = rows.map((row) => ({
    ...row,
    label: row.name,
    theory: roundPct(row.theory),
    actual: row.actual == null ? null : roundPct(row.actual),
  }));

  if (trades.length === 0) {
    return (
      <Card className="bg-white py-12 text-center shadow-sm">
        <CardContent className="space-y-2">
          <p className="text-base font-medium">还没有可汇总的收益</p>
          <p className="text-sm text-muted-foreground">
            先在「交易记账」里录入至少一笔首日买入、次日卖出，这里就会按月、按板块汇总，并对比理论最大涨幅。
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat label="记账笔数" value={`${summary.trades} 笔`} hint={`盈利 ${summary.wins} 笔`} />
        <MiniStat label="投入本金" value={formatYuan(summary.cost, 0)} hint="买入价 × 股数" />
        <MiniStat
          label="次日收益合计"
          value={formatYuan(summary.pnl, 0)}
          hint={signedPct(summary.returnPct)}
          tone={summary.pnl}
        />
        <MiniStat
          label="综合收益率"
          value={signedPct(summary.returnPct)}
          hint={`胜率 ${summary.trades ? formatNumber((summary.wins / summary.trades) * 100, 0) : "—"}%`}
          tone={summary.returnPct}
        />
      </div>

      <Card className="bg-white shadow-sm">
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold">收益分维</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                按上市月份或板块看总收益、本金和收益率。
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DIMENSIONS.map((item) => (
                <Button
                  key={item.key}
                  type="button"
                  size="sm"
                  variant={dimension === item.key ? "default" : "outline"}
                  onClick={() => setDimension(item.key)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead>维度</TableHead>
                <TableHead className="text-right">笔数</TableHead>
                <TableHead className="text-right">本金</TableHead>
                <TableHead className="text-right">收益</TableHead>
                <TableHead className="text-right">收益率</TableHead>
                <TableHead className="text-right">胜率</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buckets.map((bucket) => (
                <TableRow key={bucket.key}>
                  <TableCell className="font-medium">{bucket.label}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {bucket.trades}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatYuan(bucket.cost, 0)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-mono tabular-nums",
                      changeClass(bucket.pnl),
                    )}
                  >
                    {formatYuan(bucket.pnl, 0)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-mono tabular-nums",
                      changeClass(bucket.returnPct),
                    )}
                  >
                    {signedPct(bucket.returnPct)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {bucket.trades
                      ? `${formatNumber((bucket.wins / bucket.trades) * 100, 0)}%`
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-slate-50 font-medium">
                <TableCell>合计</TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {summary.trades}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatYuan(summary.cost, 0)}
                </TableCell>
                <TableCell className={cn("text-right font-mono tabular-nums", changeClass(summary.pnl))}>
                  {formatYuan(summary.pnl, 0)}
                </TableCell>
                <TableCell className={cn("text-right font-mono tabular-nums", changeClass(summary.returnPct))}>
                  {signedPct(summary.returnPct)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {summary.trades
                    ? `${formatNumber((summary.wins / summary.trades) * 100, 0)}%`
                    : "—"}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="bg-white shadow-sm">
        <CardContent className="flex flex-col gap-3">
          <div>
            <h2 className="text-base font-semibold">理论最大 vs 实际收益率</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              横轴按上市日期排列每只新股。空心柱是发行价打到首日最高价的理论最大涨幅，实心柱是你这笔交易的实际收益率。
            </p>
          </div>
          <div className="w-full overflow-x-auto">
            <div style={{ width: Math.max(720, chartData.length * 36), height: 380 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 8, right: 8, left: 8, bottom: 64 }}
                  barCategoryGap="18%"
                >
                  <CartesianGrid vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="label"
                    interval={0}
                    angle={-55}
                    textAnchor="end"
                    tick={{ fontSize: 11, fill: "#475569" }}
                    height={72}
                  />
                  <YAxis
                    tickFormatter={(value: number) => `${value}%`}
                    tick={{ fontSize: 11, fill: "#475569" }}
                    width={52}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const row = payload[0]?.payload as (typeof chartData)[number];
                      return (
                        <div className="rounded-lg border bg-white px-3 py-2 text-xs shadow-md">
                          <p className="font-medium">
                            {label} {row.code}
                          </p>
                          <p className="mt-1 text-slate-600">
                            理论最大 {signedPct(row.theory)}
                          </p>
                          <p className={changeClass(row.actual)}>
                            实际收益 {row.actual == null ? "未交易" : signedPct(row.actual)}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    dataKey="theory"
                    name="理论最大收益率"
                    fill="rgba(15, 39, 68, 0.04)"
                    stroke="#64748b"
                    strokeWidth={1.6}
                    maxBarSize={22}
                  />
                  <Bar
                    dataKey="actual"
                    name="实际收益率"
                    fill="#0f2744"
                    maxBarSize={22}
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MiniStat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: number | null;
}) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-foreground/10">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-xl font-semibold tracking-tight",
          tone != null ? changeClass(tone) : undefined,
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function roundPct(value: number | null): number | null {
  if (value == null) return null;
  return Math.round(value * 10) / 10;
}
