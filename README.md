# 股票组合旭日图可视化工具

一个基于 React + AntV G2 的股票投资组合旭日图可视化工具，支持多层级数据展示和 Notion 嵌入。

## 功能特性

- 📊 使用 AntV G2 生成精美的旭日图
- 🔗 每个图表拥有独立的分享链接
- 📝 支持嵌入到 Notion 进行记录复盘
- 💾 数据暂存在 JSON 文件中，便于后续迁移到数据库
- 🎨 现代化的 UI 设计

## 技术栈

- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **AntV G2** - 数据可视化
- **React Router** - 路由管理
- **Vite** - 构建工具
- **Vercel** - 部署平台

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

## 数据结构

图表数据存储在 `src/data/charts.json` 文件中。每个图表包含以下字段：

- `id`: 图表唯一标识符
- `title`: 图表标题
- `date`: 日期
- `updateTime`: 更新时间
- `dataSource`: 数据来源（可选）
- `disclaimer`: 免责声明数组（可选）
- `data`: 旭日图数据（树形结构）

### JSON 模板

参考 `src/data/chart-template.json` 了解完整的数据结构模板。

## 添加新图表

1. 在 `src/data/charts.json` 中添加新的图表数据
2. 确保每个图表有唯一的 `id`
3. 数据格式遵循 `SunburstData` 类型定义

## 部署

### Vercel 部署

1. 将代码推送到 GitHub
2. 在 Vercel 中导入项目
3. Vercel 会自动检测 Vite 配置并部署

### 环境要求

- Node.js 18+
- npm 或 yarn

## 使用 Notion 嵌入

1. 打开任意图表的详情页
2. 点击"复制嵌入代码"按钮
3. 在 Notion 中创建 `/embed` 块
4. 粘贴 iframe 代码

## 项目结构

```
stock-charts/
├── src/
│   ├── components/      # React 组件
│   │   └── SunburstChart.tsx
│   ├── pages/          # 页面组件
│   │   ├── Home.tsx
│   │   └── ChartView.tsx
│   ├── hooks/          # 自定义 Hooks
│   │   └── useCharts.ts
│   ├── types/          # TypeScript 类型定义
│   │   └── index.ts
│   ├── data/           # JSON 数据文件
│   │   ├── charts.json
│   │   └── chart-template.json
│   ├── App.tsx         # 应用入口
│   └── main.tsx        # 应用启动
├── public/             # 静态资源
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vercel.json         # Vercel 部署配置
```

## 许可证

MIT
