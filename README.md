# 2026 年主板 / 创业板 / 科创板新股

按**上市日期**排序的 2026 年 A 股新股表，已补齐股票代码、发行价、发行量、募集资金和**发行流通值**。不含北交所。

桌面原文件 `2026新股.xlsx` 未随仓库上传，本仓库按东方财富公开新股数据重建。

## 发行流通值口径

**发行流通值 = 网上发行股数 × 发行价（亿元）**

即发行口径下、面向公众投资者、上市首日通常可流通部分的市值。不含实时行情字段（最新价、当前流通市值等）。

尚未定价的新股（如电科思仪、燧原科技）代码与发行量已填，发行价 / 发行流通值待询价后补。

## 本地运行

```bash
npm install
npm run dev -- --port 43123 --hostname 127.0.0.1
```

浏览器打开 [http://127.0.0.1:43123](http://127.0.0.1:43123)。三个页签：

- **新股列表**：按上市日期排序，可筛选、下载 Excel
- **交易记账**：录入某只新股首日买入价、股数，以及次日抛出收益（写入 `data/trades.json`）
- **收益汇总**：按月、按主板/创业板/科创板查看收益；柱状图对比理论收益区间与实际收益率

口径：
- 理论最高收益率 =（次日最高价 − 首日最低价）/ 首日最低价
- 理论最低收益率 =（次日最低价 − 首日最高价）/ 首日最高价
- 实际收益率 = 次日收益 /（买入价 × 股数）

## 刷新新股数据

首页「刷新数据」会调用 `/api/refresh`：从东方财富拉取最新申购/上市名单，并补齐新浪日 K 首日/次日高低价，写入 Neon（或本地 `data/ipo_2026.json`）。`asOf` 为当天日期。

本地也可：

```bash
python3 scripts/build_ipo_data.py
npm run db:seed   # 若已配置 DATABASE_URL
```

产出：

- `data/2026新股_按上市日期.xlsx`：完整表（含字段说明工作表）
- `data/ipo_2026.json`：本地回退用的新股数据（线上优先读 Postgres）
- `data/trades.json`：本地回退用的交易记账（线上优先读写 Postgres）
- `public/ipo-2026.xlsx`：网页下载副本

数据来源：东方财富新股申购接口（`RPTA_APP_IPOAPPLY`）与新浪日 K。截止日期写在 Excel 标题行。

## 数据存储

- **本地开发**（未配置 `DATABASE_URL`）：读写 `data/ipo_2026.json` 与 `data/trades.json`
- **线上（Vercel）**：使用 Neon Serverless Postgres（Vercel Marketplace），表：
  - `ipo_meta` / `ipo_items`：新股列表
  - `trades` / `trades_meta`：交易记账  
  首次访问会自动把仓库里的 JSON 种子进库；也可手动：

```bash
vercel env pull .env.local
npm run db:seed
```

## 部署到公网（Vercel，推荐）

1. 项目已部署：https://a-share-ipo-2026.vercel.app  
2. 在 Vercel 项目接入 Neon（Storage → Create Database / `vercel integration add neon`）  
3. 接受 Neon 市场条款后，集成会写入 `DATABASE_URL` / `POSTGRES_URL`  
4. 重新 Deploy；打开 `/api/seed` 可确认种子状态  

本地不设 `DATABASE_URL` 时仍用 JSON 文件。

