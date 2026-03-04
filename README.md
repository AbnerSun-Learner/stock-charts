# stock-charts

基于 Next.js 的在线图表工具集。首页以一行多列展示工具入口，当前支持旭日图生成：上传 JSON 即可生成资产配置旭日图，支持导出配置与下载 PNG。

## 技术栈

- **Next.js 14**（App Router）
- **React 18**
- **Ant Design 5**（UI 与 Message 全局提示）
- **@ant-design/charts**（旭日图）

## 快速开始

### 安装与运行

```bash
git clone https://github.com/你的用户名/stock-charts.git
cd stock-charts
npm install
npm run dev
```

浏览器访问：

- 首页：http://localhost:3000
- 旭日图：http://localhost:3000/view/sunburst

### 环境变量（可选）

```bash
cp .env.example .env.local
```

可选在 `.env.local` 中配置 `NEXT_PUBLIC_APP_URL`，用于 og:image / 链接预览。无敏感数据，访问无需 token。

## 功能说明

### 首页

- 一行 4 列网格展示工具入口卡片。
- 当前提供「旭日图生成」入口，点击「开始使用」进入旭日图页面。

### 旭日图

- **上传 JSON**：选择与 `data/position_distribution.json` 格式一致的 JSON 文件。
- **生成图表**：点击后根据当前 JSON 渲染旭日图。
- **显示 / 隐藏 JSON 配置**：在页面内展开或收起 JSON 文本框，可编辑后「应用配置」。
- **导出当前配置**：将当前 JSON 下载为 `position_distribution.json`。
- **下载 PNG**：将当前旭日图导出为 PNG 图片。
- 操作结果通过 Ant Design 的 Message 做成功 / 失败提示。
- 页面顶部有面包屑，可从「首页」返回首页。

## JSON 格式

旭日图所需 JSON 需包含 `name`、可选 `date`，以及 **`children` 数组**。每项可有 `name`、`percentage`（如 `"63.13%"`）及嵌套的 `children`。示例结构参考仓库内 `data/position_distribution.json`。

## 项目结构

| 路径 | 说明 |
|------|------|
| `app/page.tsx` | 首页（工具入口网格） |
| `app/HomeToolGrid.tsx` | 首页工具卡片列表（客户端组件） |
| `app/view/layout.tsx` | `/view` 布局（面包屑 + 主内容，无侧栏） |
| `app/view/ViewBreadcrumb.tsx` | 面包屑（首页 / 当前页） |
| `app/view/sunburst/page.tsx` | 旭日图页面（上传、生成、导出、下载 PNG） |
| `app/AntdProvider.tsx` | Ant Design ConfigProvider + 中文 locale |
| `data/position_distribution.json` | 示例 JSON，格式参考 |
| `scripts/xlsx-to-sunburst-json.js` | 将 Excel 转为旭日图 JSON 的脚本 |

## 脚本

- **Excel 转 JSON**：`node scripts/xlsx-to-sunburst-json.js [输入.xlsx] [输出.json]`  
  默认读取桌面 `资产配置.xlsx`，输出到 `data/position_distribution.json`。

## 构建与部署

```bash
npm run build
npm run start
```

可部署到 Vercel 等平台，无需必填环境变量。在 Vercel 项目设置中可选的 `NEXT_PUBLIC_APP_URL` 用于链接预览。

## 许可证

MIT
