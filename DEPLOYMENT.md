# 部署指南（Next.js + Vercel）

本应用为 Next.js 应用，可部署在 Vercel 等平台。图表数据由用户在页面上传 JSON 文件生成，无需数据库与 token。

---

## 1. 环境变量（可选）

在 Vercel 项目 **Settings → Environment Variables** 中可按需配置：

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `NEXT_PUBLIC_APP_URL` | 否 | 应用完整 URL，用于 og:image / 链接预览。 |

无需 `SECRET_TOKEN`、Supabase 等配置。

---

## 2. 部署到 Vercel

### 通过 Vercel Dashboard（推荐）

1. 登录 [Vercel](https://vercel.com)，点击 **Add New... → Project**。
2. 从 GitHub 导入本仓库。
3. Vercel 会自动识别为 **Next.js** 项目。
4. 点击 **Deploy**，等待构建完成。

### 通过 Vercel CLI

```bash
npm i -g vercel
vercel login
cd /path/to/stock-charts
vercel
vercel --prod
```

---

## 3. 访问与嵌入

- 直接访问：`https://你的域名.vercel.app/view/sunburst`
- 在 Notion 等嵌入：使用上述 URL 作为 iframe / Embed 链接即可。

---

## 4. 本地开发

```bash
cp .env.example .env.local
npm install
npm run dev
```

- 首页：http://localhost:3000
- 旭日图：http://localhost:3000/view/sunburst

---

## 5. 故障排除

| 现象 | 可能原因 | 处理 |
|------|-----------|------|
| 旭日图无数据 | 未上传 JSON 或未点击「生成图表」 | 上传与 `data/position_distribution.json` 格式一致的 JSON，点击「生成图表」。 |
| 上传后报错 | JSON 格式不符 | 确保根对象包含 `children` 数组，每项含 `name`、可选 `percentage` 与嵌套 `children`。 |

构建或运行时错误可到 Vercel 项目 **Deployments → Logs** 查看。
