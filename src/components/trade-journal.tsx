"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Check, ChevronsUpDown, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  changeClass,
  formatDate,
  formatNumber,
  formatYuan,
  signedPct,
  theoreticalMaxPct,
  theoreticalMinPct,
  type IpoItem,
} from "@/lib/ipo";
import {
  actualReturnPct,
  createTradeId,
  tradeCost,
  type Trade,
} from "@/lib/trades";
import { cn } from "@/lib/utils";

type Props = {
  items: IpoItem[];
  trades: Trade[];
  prefillCode: string | null;
  onPrefillConsumed: () => void;
  onSave: (trade: Trade) => void;
  onDelete: (id: string) => void;
};

type FormState = {
  id: string | null;
  code: string;
  buyPrice: string;
  shares: string;
  sellPrice: string;
  pnl: string;
  note: string;
};

const emptyForm: FormState = {
  id: null,
  code: "",
  buyPrice: "",
  shares: "",
  sellPrice: "",
  pnl: "",
  note: "",
};

export function TradeJournal({
  items,
  trades,
  prefillCode,
  onPrefillConsumed,
  onSave,
  onDelete,
}: Props) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [pnlTouched, setPnlTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const byCode = useMemo(
    () => new Map(items.map((item) => [item.股票代码, item])),
    [items],
  );
  const selectedCode = prefillCode ?? form.code;
  const selected = selectedCode ? byCode.get(selectedCode) : undefined;
  const listed = useMemo(
    () => items.filter((item) => item.上市状态 === "已上市" || item.上市日期),
    [items],
  );

  useEffect(() => {
    if (!prefillCode) return;
    setForm((current) => ({ ...current, code: prefillCode }));
  }, [prefillCode]);

  const autoPnl = (() => {
    const buy = Number(form.buyPrice);
    const shares = Number(form.shares);
    const sell = Number(form.sellPrice);
    if (!buy || !shares || !sell) return null;
    return roundMoney((sell - buy) * shares);
  })();
  const pnlValue = pnlTouched || autoPnl == null ? form.pnl : String(autoPnl);

  function startEdit(trade: Trade) {
    setForm({
      id: trade.id,
      code: trade.code,
      buyPrice: String(trade.buyPrice),
      shares: String(trade.shares),
      sellPrice: trade.sellPrice == null ? "" : String(trade.sellPrice),
      pnl: String(trade.pnl),
      note: trade.note,
    });
    setPnlTouched(true);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const ipo = byCode.get(selectedCode);
    const buyPrice = Number(form.buyPrice);
    const shares = Number(form.shares);
    const sellPrice = form.sellPrice === "" ? null : Number(form.sellPrice);
    const pnl = Number(pnlValue);
    if (!ipo) {
      setError("请选择一只新股。");
      return;
    }
    if (!(buyPrice > 0) || !(shares > 0) || !Number.isFinite(pnl)) {
      setError("请填写首日买入价、股数，以及次日抛出收益。");
      return;
    }
    onSave({
      id: form.id ?? createTradeId(),
      code: ipo.股票代码,
      name: ipo.股票简称,
      board: ipo.板块,
      listingDate: ipo.上市日期,
      buyPrice,
      shares,
      sellPrice: sellPrice != null && Number.isFinite(sellPrice) ? sellPrice : null,
      pnl,
      note: form.note.trim(),
      createdAt: form.id
        ? trades.find((trade) => trade.id === form.id)?.createdAt ?? new Date().toISOString()
        : new Date().toISOString(),
    });
    setForm(emptyForm);
    setPnlTouched(false);
    setError(null);
    onPrefillConsumed();
  }

  const previewCost =
    Number(form.buyPrice) > 0 && Number(form.shares) > 0
      ? Number(form.buyPrice) * Number(form.shares)
      : null;
  const previewPct =
    previewCost && pnlValue !== "" && Number.isFinite(Number(pnlValue))
      ? (Number(pnlValue) / previewCost) * 100
      : null;

  return (
    <div className="flex flex-col gap-4">
      <Card className="bg-white shadow-sm">
        <CardContent className="flex flex-col gap-4">
          <div>
            <h2 className="text-base font-semibold">录入首日买入 / 次日卖出</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              记下上市首日买了哪只、什么价、多少股，以及次日抛出一共赚了多少。
              线上写入 Postgres，本地无库时回退到{" "}
              <code className="rounded bg-muted px-1">data/trades.json</code>。
            </p>
          </div>
          <form className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" onSubmit={submit}>
            <Field label="股票">
              <StockCombobox
                items={listed}
                value={selectedCode}
                onChange={(code) => {
                  onPrefillConsumed();
                  setForm((current) => ({ ...current, code }));
                  setError(null);
                }}
              />
            </Field>
            <Field label="首日买入价（元）">
              <Input
                inputMode="decimal"
                value={form.buyPrice}
                onChange={(event) =>
                  setForm((current) => ({ ...current, buyPrice: event.target.value }))
                }
                placeholder={selected?.首日开盘价 ? `开盘 ${selected.首日开盘价}` : "例如 28.50"}
                className="h-11 text-base sm:h-8 sm:text-sm"
              />
            </Field>
            <Field label="买入股数">
              <Input
                inputMode="numeric"
                value={form.shares}
                onChange={(event) =>
                  setForm((current) => ({ ...current, shares: event.target.value }))
                }
                placeholder="例如 500"
                className="h-11 text-base sm:h-8 sm:text-sm"
              />
            </Field>
            <Field label="次日卖出价（元，选填）">
              <Input
                inputMode="decimal"
                value={form.sellPrice}
                onChange={(event) => {
                  setPnlTouched(false);
                  setForm((current) => ({ ...current, sellPrice: event.target.value }));
                }}
                placeholder="填了会自动算收益"
                className="h-11 text-base sm:h-8 sm:text-sm"
              />
            </Field>
            <Field label="次日抛出收益（元）">
              <Input
                inputMode="decimal"
                value={pnlValue}
                onChange={(event) => {
                  setPnlTouched(true);
                  setForm((current) => ({ ...current, pnl: event.target.value }));
                }}
                placeholder="可亏可为负"
                className="h-11 text-base sm:h-8 sm:text-sm"
              />
            </Field>
            <Field label="备注">
              <Input
                value={form.note}
                onChange={(event) =>
                  setForm((current) => ({ ...current, note: event.target.value }))
                }
                placeholder="仓位、排队情况等"
                className="h-11 text-base sm:h-8 sm:text-sm"
              />
            </Field>
            <div className="flex flex-col justify-end gap-2 sm:col-span-2 xl:col-span-3">
              {selected ? (
                <p className="text-xs text-muted-foreground">
                  {selected.股票简称} 发行价 {formatYuan(selected.发行价)} · 理论区间{" "}
                  {signedPct(theoreticalMinPct(selected))} ~{" "}
                  {signedPct(theoreticalMaxPct(selected))}
                  {previewCost != null ? ` · 本金 ${formatYuan(previewCost)}` : ""}
                  {previewPct != null ? ` · 本笔收益率 ${signedPct(previewPct)}` : ""}
                </p>
              ) : null}
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <div className="flex flex-wrap gap-2">
                <Button type="submit">
                  <Plus />
                  {form.id ? "保存修改" : "记一笔"}
                </Button>
                {form.id ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setForm(emptyForm);
                      setPnlTouched(false);
                      setError(null);
                    }}
                  >
                    取消编辑
                  </Button>
                ) : null}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {trades.length === 0 ? (
        <Card className="bg-white py-12 text-center shadow-sm">
          <CardContent className="space-y-2">
            <p className="text-base font-medium">还没有交易记录</p>
            <p className="text-sm text-muted-foreground">
              从上面选一只刚上市的新股，填买入价、股数和次日收益即可。也可以在「新股列表」详情里点记一笔。
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {trades.map((trade) => (
              <TradeCard
                key={trade.id}
                trade={trade}
                theoryMin={theoreticalMinPct(byCode.get(trade.code))}
                theoryMax={theoreticalMaxPct(byCode.get(trade.code))}
                onEdit={() => startEdit(trade)}
                onDelete={() => onDelete(trade.id)}
              />
            ))}
          </div>
          <Card className="hidden overflow-hidden bg-white py-0 shadow-sm md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead>上市日</TableHead>
                  <TableHead>股票</TableHead>
                  <TableHead>板块</TableHead>
                  <TableHead className="text-right">买入价</TableHead>
                  <TableHead className="text-right">股数</TableHead>
                  <TableHead className="text-right">本金</TableHead>
                  <TableHead className="text-right">次日收益</TableHead>
                  <TableHead className="text-right">实际收益率</TableHead>
                  <TableHead className="text-right">理论区间</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {trades.map((trade) => (
                  <TableRow key={trade.id}>
                    <TableCell>{formatDate(trade.listingDate)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{trade.name}</span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {trade.code}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("ring-1", BOARD_STYLES[trade.board])}>
                        {trade.board}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatNumber(trade.buyPrice)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatNumber(trade.shares, 0)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatYuan(tradeCost(trade))}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-mono tabular-nums font-medium",
                        changeClass(trade.pnl),
                      )}
                    >
                      {formatYuan(trade.pnl)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-mono tabular-nums",
                        changeClass(actualReturnPct(trade)),
                      )}
                    >
                      {signedPct(actualReturnPct(trade))}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                      {signedPct(theoreticalMinPct(byCode.get(trade.code)))} ~{" "}
                      {signedPct(theoreticalMaxPct(byCode.get(trade.code)))}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button type="button" size="icon-sm" variant="ghost" onClick={() => startEdit(trade)}>
                          <Pencil />
                        </Button>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => onDelete(trade.id)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}

function StockCombobox({
  items,
  value,
  onChange,
}: {
  items: IpoItem[];
  value: string;
  onChange: (code: string) => void;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = items.find((item) => item.股票代码 === value);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (selected) {
      setQuery(`${selected.股票代码} ${selected.股票简称}`);
    } else if (!value) {
      setQuery("");
    }
  }, [selected, value]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        if (selected) {
          setQuery(`${selected.股票代码} ${selected.股票简称}`);
        }
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [selected]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || (selected && query === `${selected.股票代码} ${selected.股票简称}`)) {
      return items.slice(0, 80);
    }
    return items
      .filter((item) => {
        return (
          item.股票代码.includes(q) ||
          item.股票简称.toLowerCase().includes(q) ||
          (item.公司全称 ?? "").toLowerCase().includes(q)
        );
      })
      .slice(0, 80);
  }, [items, query, selected]);

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <Input
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label="输入代码或简称筛选新股"
          value={query}
          placeholder="输入代码 / 简称筛选"
          autoComplete="off"
          className="h-11 pr-9 text-base sm:h-8 sm:text-sm"
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            const next = event.target.value;
            setQuery(next);
            setOpen(true);
            if (value) onChange("");
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              if (selected) {
                setQuery(`${selected.股票代码} ${selected.股票简称}`);
              }
            }
            if (event.key === "Enter" && filtered.length === 1) {
              event.preventDefault();
              const item = filtered[0]!;
              onChange(item.股票代码);
              setQuery(`${item.股票代码} ${item.股票简称}`);
              setOpen(false);
            }
          }}
        />
        <ChevronsUpDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border bg-white py-1 shadow-lg ring-1 ring-foreground/10"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">没有匹配的新股</li>
          ) : (
            filtered.map((item) => {
              const active = item.股票代码 === value;
              return (
                <li key={item.股票代码} role="option" aria-selected={active}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted",
                      active && "bg-muted",
                    )}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      onChange(item.股票代码);
                      setQuery(`${item.股票代码} ${item.股票简称}`);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "size-3.5 shrink-0",
                        active ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="font-mono text-xs text-muted-foreground">
                      {item.股票代码}
                    </span>
                    <span className="font-medium">{item.股票简称}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatDate(item.上市日期)}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function TradeCard({
  trade,
  theoryMin,
  theoryMax,
  onEdit,
  onDelete,
}: {
  trade: Trade;
  theoryMin: number | null;
  theoryMax: number | null;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-foreground/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{trade.name}</p>
          <p className="font-mono text-xs text-muted-foreground">{trade.code}</p>
        </div>
        <Badge variant="outline" className={cn("ring-1", BOARD_STYLES[trade.board])}>
          {trade.board}
        </Badge>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">买入</p>
          <p>
            {formatNumber(trade.buyPrice)} 元 × {formatNumber(trade.shares, 0)} 股
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">次日收益</p>
          <p className={changeClass(trade.pnl)}>{formatYuan(trade.pnl)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">实际收益率</p>
          <p className={changeClass(actualReturnPct(trade))}>
            {signedPct(actualReturnPct(trade))}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">理论区间</p>
          <p>
            {signedPct(theoryMin)} ~ {signedPct(theoryMax)}
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onEdit}>
          修改
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDelete}>
          删除
        </Button>
      </div>
    </div>
  );
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
