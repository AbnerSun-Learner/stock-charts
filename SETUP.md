# 快速设置指南（Next.js）

本仓库为 **Next.js** 应用，提供带左侧菜单的图表视图（如仓位分布旭日图）。数据通过页面上传与 position_distribution.json 格式一致的 JSON，无需数据库。

---

## 1. 克隆与安装

```bash
git clone https://github.com/你的用户名/stock-charts.git
cd stock-charts
npm install
```

---

## 2. 环境变量（可选）

```bash
cp .env.example .env.local
```

可选：在 `.env.local` 中设置 `NEXT_PUBLIC_APP_URL` 等，用于链接预览。无敏感数据，访问 `/view/*` 无需 token。

---

## 3. 本地运行

```bash
npm run dev
```

在浏览器打开：

- 首页：http://localhost:3000
- 仓位分布旭日图：http://localhost:3000/view/sunburst

在旭日图页面上传 JSON 文件（格式同 `data/position_distribution.json`），点击「生成图表」即可。

---

## 4. 构建与部署

```bash
npm run build
npm run start
```

部署到 Vercel 等平台无需必填环境变量，详见 [DEPLOYMENT.md](./DEPLOYMENT.md)。

---

## 5. 项目结构概要

| 路径 | 说明 |
|------|------|
| `app/view/layout.tsx` | `/view` 布局（左侧菜单） |
| `app/view/sunburst/page.tsx` | 旭日图页面（上传 JSON、生成图表、下载 PNG） |
| `middleware.ts` | 路由匹配（无 token 校验） |
| `data/position_distribution.json` | 示例 JSON 格式参考 |

更多部署与故障排除请参考 [DEPLOYMENT.md](./DEPLOYMENT.md)。
