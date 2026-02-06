# 部署指南

## GitHub 托管

1. **初始化 Git 仓库（如果还没有）**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **创建 GitHub 仓库并推送**
   ```bash
   git remote add origin https://github.com/你的用户名/stock-charts.git
   git branch -M main
   git push -u origin main
   ```

## Vercel 部署

### 方法一：通过 Vercel Dashboard

1. 访问 [Vercel](https://vercel.com)
2. 点击 "New Project"
3. 导入你的 GitHub 仓库
4. Vercel 会自动检测到 `vercel.json` 配置文件
5. 点击 "Deploy"

### 方法二：通过 Vercel CLI

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
vercel

# 生产环境部署
vercel --prod
```

## 使用方式

### 1. 上传数据文件

将 JSON 数据文件放在 `data/` 目录下，例如：
- `data/position_distribution.json`
- `data/positions.json`

### 2. 访问图表

部署后，可以通过以下 URL 访问图表：

```
https://你的域名.vercel.app/api/chart?filename=position_distribution.json
或
https://你的域名.vercel.app/chart/position_distribution.json
```

### 3. 嵌入 Notion

1. 在 Notion 中，输入 `/embed` 或点击 "Embed"
2. 输入图表 URL：`https://你的域名.vercel.app/chart/position_distribution.json`
3. Notion 会自动加载并显示图表

### 4. 更新数据

1. 修改 `data/` 目录下的 JSON 文件
2. 提交并推送到 GitHub：
   ```bash
   git add data/position_distribution.json
   git commit -m "Update chart data"
   git push
   ```
3. Vercel 会自动重新部署（如果启用了自动部署）
4. 或者手动触发重新部署：
   - 在 Vercel Dashboard 中点击 "Redeploy"
   - 或使用 CLI：`vercel --prod`

## 数据文件格式

JSON 文件应包含以下结构：

```json
{
  "name": "长赢150",
  "date": "2025-11-03",
  "children": [
    {
      "name": "A股",
      "shares": 80,
      "percentage": "50.16%",
      "children": [...]
    }
  ]
}
```

## 注意事项

- 确保 `requirements.txt` 包含所有依赖
- 图表生成可能需要几秒钟，请耐心等待
- 如果遇到问题，检查 Vercel 的 Function Logs
