# 部署指南

## GitHub 推送步骤

1. 在 GitHub 上创建一个新仓库（例如：`stock-charts`）

2. 添加远程仓库并推送代码：

```bash
git remote add origin https://github.com/你的用户名/stock-charts.git
git branch -M main
git push -u origin main
```

## Vercel 部署步骤

1. 登录 [Vercel](https://vercel.com)

2. 点击 "New Project"（新建项目）

3. 导入你的 GitHub 仓库

4. Vercel 会自动检测项目配置：
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`

5. 点击 "Deploy" 开始部署

6. 部署完成后，你会获得一个生产环境的 URL

## 环境变量

当前项目不需要环境变量，所有数据都存储在 JSON 文件中。

## 后续数据库迁移

当需要将数据迁移到数据库时：

1. 创建 API 路由（可以使用 Vercel Serverless Functions）
2. 修改 `src/hooks/useCharts.ts` 从 API 获取数据
3. 更新数据管理逻辑

## 自定义域名

在 Vercel 项目设置中可以配置自定义域名。
