"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error || "登录失败");
      }
      const from = searchParams.get("from") || "/";
      router.replace(from);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm bg-white shadow-lg">
      <CardContent className="flex flex-col gap-4 pt-2">
        <div className="space-y-1 text-center">
          <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
            2026 A-SHARE IPO
          </p>
          <h1 className="text-xl font-semibold">登录</h1>
          <p className="text-sm text-muted-foreground">
            默认账号 admin / admin，登录后可在菜单里修改密码。
          </p>
        </div>
        <form className="flex flex-col gap-3" onSubmit={submit}>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-xs text-muted-foreground">用户名</span>
            <Input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              className="h-11"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-xs text-muted-foreground">密码</span>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className="h-11"
            />
          </label>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="h-11" disabled={loading}>
            {loading ? "登录中…" : "登录"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-4 py-12">
      <Suspense
        fallback={
          <div className="text-sm text-muted-foreground">加载中…</div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
