# 快速设置指南（Next.js）

本仓库为 **Next.js** 应用，提供带左侧菜单的图表视图（如仓位分布旭日图），支持带签名 URL 与 Notion 嵌入。

---

## 1. 克隆与安装

```bash
git clone https://github.com/你的用户名/stock-charts.git
cd stock-charts
npm install
```

---

## 2. 环境变量

```bash
cp .env.example .env.local
```

编辑 `.env.local`，至少设置：

- **SECRET_TOKEN**：用于访问 `/view/*` 的暗号，本地可随意设一个字符串（如 `dev123`）。生产环境请使用长随机串且不要提交到 Git。

可选（使用 Supabase 时）：

- **SUPABASE_URL**：Supabase 项目 URL  
- **SUPABASE_SERVICE_ROLE_KEY**：Supabase 的 service_role 密钥  

不配置 Supabase 时，应用会从仓库内的 `data/position_distribution.json` 读取旭日图数据。

---

## 3. 本地运行

```bash
npm run dev
```

在浏览器打开（将 `dev123` 换成你在 `.env.local` 里设置的 `SECRET_TOKEN`）：

- 首页：http://localhost:3000  
- 仓位分布旭日图：http://localhost:3000/view/sunburst?token=dev123  

---

## 4. 使用 Supabase 存储数据（可选）

1. 在 [Supabase](https://supabase.com) 创建项目。  
2. 在 SQL Editor 中执行 `supabase/seed_chart_position_distribution.sql` 中的全部 SQL（建表 + RLS + 插入一条数据）。  
3. 在 Supabase 项目 **Settings → API** 中复制 **Project URL** 和 **service_role** key，填入 `.env.local` 的 `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY`。  
4. 重启 `npm run dev`，刷新旭日图页面，数据将来自 Supabase。

---

## 5. 构建与部署

```bash
npm run build
npm run start   # 本地生产模式
```

部署到 Vercel 时，在项目设置中配置环境变量 `SECRET_TOKEN`（及可选的 Supabase 变量）。详细步骤见 [DEPLOYMENT.md](./DEPLOYMENT.md)。

---

## 6. 在 Notion 中嵌入

使用带 token 的完整 URL 作为 Embed 链接，例如：

```
https://你的域名.vercel.app/view/sunburst?token=你的SECRET_TOKEN
```

注意：该链接会暴露 token，仅限在私密 Notion 页面或内部使用，勿公开发布。

---

## 7. 项目结构概要

| 路径 | 说明 |
|------|------|
| `app/view/layout.tsx` | `/view` 布局（左侧菜单 + 安全头） |
| `app/view/sunburst/page.tsx` | 仓位分布旭日图页面 |
| `app/api/chart/position-distribution/route.ts` | 图表数据 API（Supabase 或本地 JSON） |
| `middleware.ts` | 对 `/view/*` 做 token 校验并设置安全头 |
| `supabase/seed_chart_position_distribution.sql` | Supabase 建表与种子数据 SQL |
| `data/position_distribution.json` | 本地回退数据（未配置 Supabase 时使用） |

更多部署与故障排除请参考 [DEPLOYMENT.md](./DEPLOYMENT.md)。
