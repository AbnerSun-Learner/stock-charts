# 部署指南（Next.js + Vercel）

本应用为 Next.js 应用，部署在 Vercel 上。图表页面受「暗号」保护，仅带正确 `token` 的 URL 可访问；数据可存于 Supabase 私有表或本地 JSON 文件。

---

## 1. 环境变量（必读）

在 Vercel 项目 **Settings → Environment Variables** 中配置（生产与预览环境建议都配置）：

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `SECRET_TOKEN` | **是** | 访问 `/view/*` 的暗号。请使用长随机字符串，勿提交到仓库。 |
| `SUPABASE_URL` | 否 | Supabase 项目 URL。不配置时，应用会从 `data/position_distribution.json` 读取数据（仅构建/运行时有该文件时可用）。 |
| `SUPABASE_SERVICE_ROLE_KEY` | 否 | Supabase 的 service_role 密钥。与 `SUPABASE_URL` 同时配置时，图表数据从 Supabase 表读取。 |

- 本地开发：复制 `.env.example` 为 `.env.local`，填入 `SECRET_TOKEN`（及可选的 Supabase 变量）。
- **切勿**将 `SECRET_TOKEN` 或 `SUPABASE_SERVICE_ROLE_KEY` 写入代码或提交到 Git。

---

## 2. Supabase 配置（可选）

若希望图表数据来自 Supabase 私有表：

1. 在 [Supabase](https://supabase.com) 创建项目。
2. 在 SQL Editor 中执行项目中的建表与种子脚本：
   - 打开 `supabase/seed_chart_position_distribution.sql`
   - 复制全部内容到 Supabase SQL Editor 并执行（会创建表、启用 RLS、插入一条仓位分布数据）。
3. 在 Vercel 中配置 `SUPABASE_URL` 与 `SUPABASE_SERVICE_ROLE_KEY`（在 Supabase 项目 Settings → API 中获取）。

未配置 Supabase 时，应用会尝试从仓库内的 `data/position_distribution.json` 提供数据（仅适用于未移除该文件且构建包含该文件的部署）。

---

## 3. 部署到 Vercel

### 通过 Vercel Dashboard（推荐）

1. 登录 [Vercel](https://vercel.com)，点击 **Add New... → Project**。
2. 从 GitHub 导入本仓库。
3. Vercel 会自动识别为 **Next.js** 项目，无需改 Framework。
4. 在 **Environment Variables** 中添加 `SECRET_TOKEN`（以及可选的 `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`）。
5. 点击 **Deploy**，等待构建完成。

### 通过 Vercel CLI

```bash
npm i -g vercel
vercel login
cd /path/to/stock-charts
vercel
# 按提示关联或创建项目；环境变量需在 Dashboard 中配置
vercel --prod   # 生产环境
```

---

## 4. 访问与嵌入

### 带签名的访问链接

只有 URL 中带有与 `SECRET_TOKEN` 一致的 `token` 时，才能打开 `/view/*` 页面：

```
https://你的域名.vercel.app/view/sunburst?token=你的SECRET_TOKEN
```

- 将上面的 `你的SECRET_TOKEN` 替换为你在 Vercel 中配置的 `SECRET_TOKEN` 值。
- 请勿在公开场合泄露该链接或 token。

### 在 Notion 中嵌入

1. 在 Notion 页面输入 `/embed` 或点击 **Embed**。
2. 嵌入链接填写（注意带上 `token` 参数）：
   ```
   https://你的域名.vercel.app/view/sunburst?token=你的SECRET_TOKEN
   ```
3. 保存后，仅允许本站与 Notion 通过 iframe 加载该页面（通过 CSP `frame-ancestors` 控制）。

### 安全与防爬

- 页面会设置 `X-Robots-Tag: noindex, nofollow`，降低被搜索引擎收录的可能。
- iframe 仅允许 `'self'`、`https://www.notion.so`、`https://notion.so` 嵌入。

---

## 5. 本地开发

```bash
cp .env.example .env.local
# 编辑 .env.local，至少设置 SECRET_TOKEN=某个测试用字符串

npm install
npm run dev
```

在浏览器访问（将 `testtoken` 换成你在 `.env.local` 里设置的 `SECRET_TOKEN`）：

- 首页：http://localhost:3000
- 旭日图：http://localhost:3000/view/sunburst?token=testtoken

---

## 6. 更新图表数据

- **使用 Supabase 时**：在 Supabase 中更新 `chart_position_distribution` 表（或重新执行/编写 SQL），无需重新部署。
- **使用本地 JSON 时**：修改 `data/position_distribution.json` 后提交并推送，触发 Vercel 重新部署即可。

---

## 7. 故障排除

| 现象 | 可能原因 | 处理 |
|------|-----------|------|
| 打开 `/view/sunburst` 返回 403 | 未带 `token` 或 `token` 与 `SECRET_TOKEN` 不一致 | 在 URL 加上 `?token=你的SECRET_TOKEN`，并确认环境变量已配置且已重新部署。 |
| 旭日图显示「暂无数据」或报错 | 数据源未配置或失败 | 若用 Supabase，检查 `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY` 及表是否已创建并插入数据；若用本地 JSON，确认 `data/position_distribution.json` 存在且格式正确。 |
| Notion 中嵌入不显示 | 链接未带 token 或域名被限制 | 使用带 `?token=...` 的完整 URL；确认部署域名与 CSP 中允许的域名一致。 |

构建或运行时错误可到 Vercel 项目 **Deployments → 某次部署 → Logs / Function Logs** 查看。
