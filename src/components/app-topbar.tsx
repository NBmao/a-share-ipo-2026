"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  ChartColumn,
  Download,
  KeyRound,
  MoreVertical,
  NotebookPen,
  RefreshCw,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type AppTab = "list" | "journal" | "summary";

const TABS: Array<{
  id: AppTab;
  label: string;
  short: string;
  icon: typeof Search;
}> = [
  { id: "list", label: "新股列表", short: "列表", icon: Search },
  { id: "journal", label: "交易记账", short: "记账", icon: NotebookPen },
  { id: "summary", label: "收益汇总", short: "汇总", icon: ChartColumn },
];

type Props = {
  asOf: string;
  refreshMessage: string | null;
  refreshing: boolean;
  tab: AppTab;
  onTabChange: (tab: AppTab) => void;
  onRefresh: () => void;
};

export function AppTopbar({
  asOf,
  refreshMessage,
  refreshing,
  tab,
  onTabChange,
  onRefresh,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0f2744] text-white shadow-md">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-2 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:gap-3 sm:px-6 sm:py-2.5 lg:px-8">
          <div className="hidden min-w-0 shrink-0 sm:block sm:max-w-[140px] lg:max-w-[180px]">
            <p className="truncate text-[10px] font-medium tracking-[0.14em] text-sky-200/80 uppercase lg:text-[11px]">
              2026 IPO
            </p>
            <p className="truncate text-xs text-slate-300 lg:text-sm">
              截至 {asOf}
            </p>
          </div>

          <div
            role="tablist"
            aria-label="功能页签"
            className="flex min-w-0 flex-1 items-center justify-center gap-1 rounded-xl bg-black/20 p-1 sm:gap-1.5 sm:p-1.5"
          >
            {TABS.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onTabChange(item.id)}
                  className={cn(
                    "inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-1.5 text-xs font-semibold transition-colors sm:h-12 sm:gap-2 sm:px-3 sm:text-sm lg:text-base [&_svg]:pointer-events-none [&_svg]:shrink-0",
                    active
                      ? "bg-white text-[#0f2744] shadow-sm"
                      : "text-slate-200 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <Icon className="size-4 sm:size-[18px]" aria-hidden />
                  <span className="truncate sm:hidden">{item.short}</span>
                  <span className="hidden truncate sm:inline">{item.label}</span>
                </button>
              );
            })}
          </div>

          <div ref={menuRef} className="relative shrink-0">
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label="更多操作"
              onClick={() => setMenuOpen((open) => !open)}
              className="size-11 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white sm:size-12"
            >
              <MoreVertical className="size-5" />
            </Button>
            {menuOpen ? (
              <div
                role="menu"
                className="absolute top-full right-0 z-50 mt-1.5 min-w-[11rem] overflow-hidden rounded-lg border bg-white py-1 text-sm text-foreground shadow-lg ring-1 ring-foreground/10"
              >
                <MenuButton
                  icon={<RefreshCw className={cn("size-4", refreshing && "animate-spin")} />}
                  label={refreshing ? "刷新中…" : "刷新数据"}
                  disabled={refreshing}
                  onClick={() => {
                    setMenuOpen(false);
                    onRefresh();
                  }}
                />
                <a
                  role="menuitem"
                  href="/ipo-2026.xlsx"
                  download="2026新股_按上市日期.xlsx"
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-muted"
                  onClick={() => setMenuOpen(false)}
                >
                  <Download className="size-4 shrink-0" />
                  下载 Excel
                </a>
                <MenuButton
                  icon={<KeyRound className="size-4" />}
                  label="修改 admin 密码"
                  onClick={() => {
                    setMenuOpen(false);
                    setPasswordOpen(true);
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>
        {refreshMessage ? (
          <p className="border-t border-white/10 px-3 py-1.5 text-center text-xs text-sky-100/90 sm:px-6">
            {refreshMessage}
          </p>
        ) : null}
      </header>

      <ChangePasswordSheet open={passwordOpen} onOpenChange={setPasswordOpen} />
    </>
  );
}

function MenuButton({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-muted disabled:opacity-50"
    >
      {icon}
      {label}
    </button>
  );
}

function ChangePasswordSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError(null);
      setSuccess(null);
    }
  }, [open]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    if (newPassword !== confirmPassword) {
      setError("两次输入的新密码不一致");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error || "修改失败");
      }
      setSuccess("密码已更新");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "修改失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>修改 admin 密码</SheetTitle>
          <SheetDescription>
            请输入当前密码和新密码。用户名仍为 admin。
          </SheetDescription>
        </SheetHeader>
        <form className="flex flex-col gap-3 px-4 pb-6" onSubmit={submit}>
          <Field label="当前密码">
            <Input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
              className="h-11"
            />
          </Field>
          <Field label="新密码">
            <Input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              className="h-11"
            />
          </Field>
          <Field label="确认新密码">
            <Input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              className="h-11"
            />
          </Field>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
          <Button type="submit" className="h-11" disabled={loading}>
            {loading ? "保存中…" : "保存新密码"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
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
