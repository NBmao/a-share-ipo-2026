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

## 更新数据

```bash
python3 -m pip install -r requirements.txt
python3 scripts/build_ipo_data.py
cp data/2026新股_按上市日期.xlsx public/
cp data/2026新股_按上市日期.xlsx public/ipo-2026.xlsx
```

产出：

- `data/2026新股_按上市日期.xlsx`：完整表（含字段说明工作表）
- `data/ipo_2026.json`：页面使用的新股数据
- `data/trades.json`：交易记账数据（通过页面 `/api/trades` 读写）
- `public/ipo-2026.xlsx`：网页下载副本

数据来源：东方财富新股申购接口（`RPTA_APP_IPOAPPLY`）与新浪日 K。截止日期写在 Excel 标题行。

## 部署到公网（Vercel，推荐）

本项目是 Next.js，可一键部署到 [Vercel](https://vercel.com)。

1. 打开导入页：  
   [https://vercel.com/new/import?s=https://github.com/NBmao/a-share-ipo-2026](https://vercel.com/new/import?s=https://github.com/NBmao/a-share-ipo-2026)
2. 用 GitHub 登录 Vercel，选择仓库 `NBmao/a-share-ipo-2026`，Framework 选 Next.js，直接 Deploy。
3. 为了让「交易记账」在线上也能保存，到 Vercel 项目 → Settings → Environment Variables 添加：

| Name | Value |
| --- | --- |
| `TRADES_GITHUB_TOKEN` | 有 `repo` 权限的 GitHub PAT |
| `TRADES_GITHUB_REPO` | `NBmao/a-share-ipo-2026` |
| `TRADES_GITHUB_BRANCH` | `main` |

4. 重新 Deploy 一次。之后页面记账会写回仓库里的 `data/trades.json`。

本地开发不设这些变量时，仍直接读写本地 `data/trades.json`。

