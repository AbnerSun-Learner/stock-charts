# Notion 嵌入预览修复说明

本文档记录「在 Notion 中嵌入 Vercel 部署链接并展示图表预览」从无法展示到正常展示的修复过程，便于日后排查或复现。

---

## 一、现象

- 在 Notion 中粘贴图表页链接后，只显示「在浏览器中点击查看…」的简单链接样式，无法展示标题、描述和预览图。
- 部分环境下 Notion 抓取时收到 **401 Unauthorized** 或 **403 Forbidden**，导致无法读取页面中的 Open Graph 元数据。

---

## 二、原因概览

1. **鉴权拦截**：`/view/*` 由中间件做 token 校验，无 token 返回 403。Notion 抓取链接时不会带你的 `?token=xxx`，因此被拒绝，拿不到带 OG 的 HTML。
2. **Vercel 部署保护**：若在 Vercel 上开启了 Password Protection / Vercel Authentication，所有请求会先被 Vercel 返回 **401**，请求到不了 Next.js，Notion 无法获取任何预览。
3. **根路径无预览图**：Notion 有时会先请求根路径 `/`。若用户粘贴的是首页链接，或 Notion 先探测 `/`，而根路径没有 `og:image`，预览效果会不完整或失败。
4. **预览图 URL 可能错误**：若未在 Vercel 配置生产环境域名，`metadataBase` 可能不正确，导致 `og:image` 使用错误域名，Notion 无法加载预览图。

---

## 三、修复方案

### 3.1 中间件：对预览爬虫放行（无 token 也返回 200）

**文件**：`middleware.ts`

- 对访问 `/view/*` 的请求，若无有效 token，则根据 **User-Agent** 判断是否为「预览/爬虫」：
  - 若 User-Agent 为空、或包含 `Notion`、`notion.so`、`facebookexternalhit`、`Twitterbot`、`Slack`、`embed`、`crawler`、`bot`、`unfurl`、`preview` 等常见爬虫/预览客户端，则 **放行**（返回 200，正常输出 HTML 与 OG 元数据）。
  - 否则返回 403（保持对普通浏览器无 token 访问的鉴权）。
- 这样 Notion（以及 Slack、Twitter 等）抓取链接时能拿到带 `og:title`、`og:description`、`og:image` 的页面，从而展示预览卡片。

### 3.2 为根路径和图表页配置 Open Graph

- **根路径 `/`**  
  - 在 `app/opengraph-image.tsx` 中为首页生成 OG 图（如「仓位视图」标题 + 简单图形），使粘贴首页链接时也有预览图。
- **图表页 `/view/sunburst`**  
  - 在 `app/view/sunburst/layout.tsx` 中配置该页的 `title`、`description`、`openGraph`、`twitter`。  
  - 在 `app/view/sunburst/opengraph-image.tsx` 中为该页生成专用 OG 图（如「仓位分布（旭日图）」）。  
- 根布局 `app/layout.tsx` 中已有全局 `metadataBase`、`openGraph`、`twitter`，与上述分段 metadata 合并后，Notion 能正确读取标题、描述和图片。

### 3.3 正确设置 metadataBase（预览图地址）

**文件**：`app/layout.tsx`

- `metadataBase` 决定 `og:image` 等使用绝对 URL 时的域名。
- 优先使用环境变量 **`NEXT_PUBLIC_APP_URL`**（在 Vercel 中设为生产域名，如 `https://你的项目.vercel.app`），其次使用 **`VERCEL_URL`**，最后回退到 `http://localhost:3000`。
- 在 Vercel 项目 **Settings → Environment Variables** 中为生产环境添加：
  - `NEXT_PUBLIC_APP_URL` = `https://你的实际域名.vercel.app`  
  保存后重新部署，确保预览图链接指向正确域名。

### 3.4 关闭 Vercel 部署保护（避免 401）

- 若项目开启了 **Deployment Protection**（Password Protection / Vercel Authentication），所有未通过 Vercel 认证的请求会先收到 **401**，Next.js 和中间件不会执行，Notion 无法抓取页面。
- 在 Vercel 项目 **Settings → Deployment Protection** 中关闭密码保护 / Vercel Authentication；对 `/view/*` 的访问控制仅依赖应用内中间件 + token 即可。

### 3.5 环境变量说明（可选）

**文件**：`.env.example`

- 增加 **`NEXT_PUBLIC_APP_URL`** 的注释说明，便于在 Vercel 或本地配置生产预览域名。

---

## 四、使用与验证

1. **部署**：将上述改动部署到 Vercel，并确保：
   - 已关闭 Deployment Protection（或至少保证 Notion 的请求不会先被 401）。
   - 已设置 `NEXT_PUBLIC_APP_URL` 并重新部署。
2. **在 Notion 中嵌入**：
   - 删除旧的嵌入块，重新粘贴链接。
   - 可粘贴首页：`https://你的域名.vercel.app`，或图表页：`https://你的域名.vercel.app/view/sunburst`，两者均应出现标题、描述和预览图。
3. **安全**：无 token 的普通浏览器访问 `/view/sunburst` 仍会收到 403；仅带预览爬虫 UA 或空 UA 的请求会被放行以生成预览。

---

## 五、涉及文件一览

| 文件 | 修改要点 |
|------|----------|
| `middleware.ts` | 对预览爬虫 UA（及空 UA）放行 `/view/*`，无 token 也返回 200；其余仍 403。 |
| `app/layout.tsx` | `metadataBase` 优先使用 `NEXT_PUBLIC_APP_URL`。 |
| `app/opengraph-image.tsx` | 新增，为根路径 `/` 提供 OG 图。 |
| `app/view/sunburst/layout.tsx` | 图表页 metadata（title、description、openGraph、twitter）。 |
| `app/view/sunburst/opengraph-image.tsx` | 图表页专用 OG 图。 |
| `.env.example` | 增加 `NEXT_PUBLIC_APP_URL` 说明。 |

---

## 六、若再次无法展示时可排查

1. **Notion 仍只显示「在浏览器中打开」**  
   - 检查 Vercel 是否又开启了 Deployment Protection（看请求是否 401）。  
   - 检查 Vercel 运行时日志，确认 Notion 的请求是否到达 Next.js（是否有 200 或 403 的访问记录）。  

2. **有标题/描述但没有预览图**  
   - 确认 `NEXT_PUBLIC_APP_URL` 已设且为 `https://` 开头的生产域名，并重新部署。  
   - 在浏览器中直接打开 `https://你的域名.vercel.app/view/sunburst/opengraph-image`（或根路径对应 OG 图 URL），确认能返回图片。  

3. **仅粘贴图表页链接不展示、粘贴首页可展示（或反之）**  
   - 确认对应路径下存在 `layout.tsx` 的 metadata 与 `opengraph-image.tsx`（或等价配置），且中间件对该路径的爬虫请求为放行。  

以上为本次 Notion 嵌入展示修复的完整说明与后续排查要点。
