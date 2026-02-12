# Supabase MCP 配置修复指南

## 问题描述

### 错误 1（已解决）：
```
2026-02-09 14:17:39.590 [error] No server info found
```
原因：Supabase MCP 服务器配置缺少必要的认证信息。

### 错误 2（最新）：
```
2026-02-09 14:32:32.377 [error] Client error for command fetch failed
2026-02-09 14:32:32.379 [warning] Error connecting to streamableHttp server, falling back to SSE: fetch failed
```
原因：使用了错误的 MCP 服务器配置方式（URL 方式），应该使用本地命令方式。

## 解决方案（已更新）

### 正确的配置方式

Supabase MCP 服务器应该使用 **本地命令方式** 而不是远程 URL 方式。

**正确的配置**（`~/.cursor/mcp.json`）：

```json
{
  "mcpServers": {
    "Figma": {
      "url": "https://mcp.figma.com/mcp",
      "headers": {}
    },
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest"]
    },
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase",
        "--project-url",
        "https://zebvavqxkvxhywmpkxxw.supabase.co",
        "--access-token",
        "你的_service_role_key"
      ]
    }
  }
}
```

### 配置步骤

1. **获取 Supabase 信息**
   - 访问 [Supabase Dashboard](https://supabase.com/dashboard)
   - 选择项目 `zebvavqxkvxhywmpkxxw`
   - 进入 **Settings → API**
   - 复制 **Project URL** 和 **service_role** key

2. **更新配置文件已完成**
   - 配置文件已更新为正确的命令方式
   - 使用您的实际 service role key

3. **重启 Cursor**
   - 完全退出 Cursor（Cmd+Q）
   - 重新启动应用
   - 等待 MCP 服务器初始化（约 5-10 秒）

### 替代方案：禁用 Supabase MCP（如果不需要）

如果您不需要 Supabase MCP 功能，可以从配置中移除：

编辑 `~/.cursor/mcp.json`：

```json
{
  "mcpServers": {
    "Figma": {
      "url": "https://mcp.figma.com/mcp",
      "headers": {}
    },
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest"]
    }
  }
}
```

然后重启 Cursor。

## 关键修复说明

### 为什么之前的配置不工作？

**错误配置**（使用 URL 方式）：
```json
"supabase": {
  "url": "https://mcp.supabase.com/mcp?project_ref=...",
  "headers": { "Authorization": "Bearer ..." }
}
```

**问题**：
- Supabase MCP 不支持远程 URL 方式
- 导致 OAuth 回调失败
- 连接 streamableHttp 服务器失败

**正确配置**（使用本地命令方式）：
```json
"supabase": {
  "command": "npx",
  "args": [
    "-y",
    "@supabase/mcp-server-supabase",
    "--project-url", "https://your-project.supabase.co",
    "--access-token", "your-service-role-key"
  ]
}
```

**优势**：
- 在本地运行 MCP 服务器
- 直接使用 access token 认证
- 避免 OAuth 流程和网络连接问题

## 验证修复

重启 Cursor 后，错误日志应该不再出现。您可以通过以下方式验证：

1. 打开 Cursor
2. 等待几秒钟让 MCP 服务器初始化
3. 检查是否还有相同的错误信息

## 关于本项目的 Supabase 配置

本项目（stock-charts）也使用 Supabase 存储图表数据。如果您想在应用中使用 Supabase：

1. 创建 `.env.local` 文件：
   ```bash
   cp .env.example .env.local
   ```

2. 编辑 `.env.local`，添加：
   ```
   SECRET_TOKEN=dev123
   SUPABASE_URL=https://zebvavqxkvxhywmpkxxw.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=你的service_role密钥
   ```

3. 运行应用：
   ```bash
   npm run dev
   ```

## 备份说明

已创建配置备份：`~/.cursor/mcp.json.backup`

如需恢复原配置：
```bash
cp ~/.cursor/mcp.json.backup ~/.cursor/mcp.json
```

## 相关文档

- [Supabase MCP 文档](https://supabase.com/docs/guides/ai/mcp)
- [项目设置指南](./SETUP.md)
- [部署指南](./DEPLOYMENT.md)
