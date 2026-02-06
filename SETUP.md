# 快速设置指南

## 1. GitHub 仓库设置

### 初始化并推送代码

```bash
# 如果还没有初始化 git
git init

# 添加所有文件
git add .

# 提交
git commit -m "Initial commit: Stock charts with Vercel deployment"

# 在 GitHub 上创建新仓库，然后：
git remote add origin https://github.com/你的用户名/stock-charts.git
git branch -M main
git push -u origin main
```

## 2. Vercel 部署

### 方法一：通过 Vercel Dashboard（推荐）

1. 访问 [vercel.com](https://vercel.com) 并登录
2. 点击 **"Add New..."** → **"Project"**
3. 从 GitHub 导入你的 `stock-charts` 仓库
4. Vercel 会自动检测配置：
   - Framework Preset: Other
   - Root Directory: `./`
5. 点击 **"Deploy"**
6. 等待部署完成（通常 1-2 分钟）

### 方法二：通过 Vercel CLI

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 在项目目录下部署
cd /path/to/stock-charts
vercel

# 生产环境部署
vercel --prod
```

## 3. 获取图表 URL

部署完成后，你会得到一个类似这样的域名：
```
https://stock-charts-xxx.vercel.app
```

**访问图表的方式：**

1. **通过 API 路径：**
   ```
   https://你的域名.vercel.app/api/chart?filename=position_distribution.json
   ```

2. **通过友好路径：**
   ```
   https://你的域名.vercel.app/chart/position_distribution.json
   ```

## 4. 在 Notion 中嵌入

1. 在 Notion 页面中，输入 `/embed` 或点击 **"Embed"**
2. 输入图表 URL：
   ```
   https://你的域名.vercel.app/chart/position_distribution.json
   ```
3. 点击 **"Embed link"**
4. 图表会自动加载并显示

## 5. 更新数据并同步

### 更新步骤：

1. **修改数据文件：**
   ```bash
   # 编辑 data/position_distribution.json
   vim data/position_distribution.json
   # 或使用任何编辑器
   ```

2. **提交并推送：**
   ```bash
   git add data/position_distribution.json
   git commit -m "Update chart data"
   git push
   ```

3. **Vercel 自动部署：**
   - 如果启用了 GitHub 集成，Vercel 会自动检测推送
   - 自动触发重新部署（通常 1-2 分钟）

4. **在 Notion 中刷新：**
   - 刷新 Notion 页面
   - 图表会自动显示最新数据

### 手动触发部署：

如果自动部署没有触发，可以在 Vercel Dashboard 中：
1. 进入项目页面
2. 点击 **"Deployments"** 标签
3. 点击 **"Redeploy"** 按钮

## 6. 添加新的图表

1. **添加新的数据文件：**
   ```bash
   # 创建新的 JSON 文件
   cp data/position_distribution.json data/new-chart.json
   # 编辑 new-chart.json
   ```

2. **访问新图表：**
   ```
   https://你的域名.vercel.app/chart/new-chart.json
   ```

3. **在 Notion 中嵌入：**
   - 使用新的 URL 创建新的 embed 块

## 故障排除

### 图表不显示

1. **检查 URL 是否正确：**
   - 确保文件名包含 `.json` 扩展名
   - 检查文件名是否存在于 `data/` 目录

2. **检查 Vercel 日志：**
   - 在 Vercel Dashboard 中查看 Function Logs
   - 查看是否有错误信息

3. **检查数据格式：**
   - 确保 JSON 文件格式正确
   - 可以使用在线 JSON 验证工具检查

### 部署失败

1. **检查 requirements.txt：**
   - 确保所有依赖都已列出
   - 版本号要兼容

2. **检查 Python 版本：**
   - Vercel 默认使用 Python 3.9
   - 确保代码兼容

3. **检查文件路径：**
   - 确保所有文件路径使用相对路径
   - 不要使用硬编码的绝对路径

## 自定义域名（可选）

1. 在 Vercel Dashboard 中进入项目设置
2. 点击 **"Domains"** 标签
3. 添加你的自定义域名
4. 按照提示配置 DNS 记录

## 环境变量（如果需要）

如果将来需要添加环境变量（如 API keys）：
1. 在 Vercel Dashboard 中进入项目设置
2. 点击 **"Environment Variables"**
3. 添加变量
4. 重新部署
