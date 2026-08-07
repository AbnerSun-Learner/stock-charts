# Vercel Production 部署失败 Bark 推送

**日期**：2026-08-07  
**状态**：已确认（方案 1：扩展现有 GitHub Actions）  
**文件**：`.github/workflows/notify-bark.yml`

## 目标

在现有「Production 部署成功 → Bark」基础上，补上 **Production 部署失败** 的 Bark 推送，便于及时感知构建/发布失败。

## 非目标

- 不推送 Preview 部署（成功或失败）。
- 不改为 Vercel Webhook / 本仓 API 中转。
- 不新增其它通知渠道，不改 Bark 服务端配置。
- 不在应用业务代码中接入通知逻辑。

## 现状

`notify-bark.yml` 监听 `deployment_status`，仅在以下同时满足时推送：

- `deployment_status.state == success`
- `deployment.creator.login == vercel[bot]`
- `deployment.environment == Production`

密钥：`secrets.BARK_KEY`；未配置则 warning 并跳过。

## 方案

扩展同一 workflow 的 `if` 与文案分支，复用现有触发链与密钥。

### 触发条件

同时满足：

1. `github.event.deployment.creator.login == 'vercel[bot]'`
2. `github.event.deployment.environment == 'Production'`
3. `github.event.deployment_status.state` ∈ `success` | `failure` | `error`

`pending` / `in_progress` / `queued` 等中间态不推送。

### 通知内容

| 字段  | 成功                               | 失败（`failure` / `error`）                                     |
| ----- | ---------------------------------- | --------------------------------------------------------------- |
| title | `Vercel 部署成功`                  | `Vercel 部署失败`                                               |
| body  | 仓库 / 分支 / Commit Message       | 同上；若 `deployment_status.description` 非空则追加一行错误摘要 |
| group | `stock-charts`                     | 同左                                                            |
| url   | 优先 `environment_url`，否则仓库页 | 同左                                                            |
| sound | `minuet`                           | 同左（保持现有；不因失败换铃）                                  |

### 密钥与容错

- 继续使用 `secrets.BARK_KEY`。
- 未配置：`::warning::` 后 `exit 0`，不失败 job。
- `curl` 保持 `-sf`：Bark API 失败则 job 失败，便于在 Actions 中可见。

## 验收标准

1. Production 部署成功仍收到 Bark，文案与现有一致（可含原有字段）。
2. Production 部署失败（或 error）收到 Bark，标题为「Vercel 部署失败」。
3. Preview 部署成功/失败均不推送。
4. 未配置 `BARK_KEY` 时 job 不红，仅 warning。

## 实现范围

仅修改 `.github/workflows/notify-bark.yml`（条件 + 标题/正文分支）；不涉及应用源码与依赖变更。
