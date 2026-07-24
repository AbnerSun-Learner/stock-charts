# 账目时间列 · 心理账户关联开关与时间进度

**日期**：2026-07-24  
**状态**：已实现（2026-07-24；DDL 已应用到目标库）
**相关**：[心理账户](./2026-07-23-family-mental-account-design.md)、[优先级](./2026-07-24-family-mental-account-priority-design.md)

## 目标

1. 资产记账「资产 / 负债」表增加创建时间、更新时间列。
2. 心理账户持久化「是否显示关联账户」开关。
3. 水波图右侧展示时间进度，并与存款进度对比给出鼓励文案。
4. 本次相关省略号节点 hover 显示全文。

## 非目标

- 不扫全站 / 全家庭财务页的省略号。
- 不在本仓提交权威 DDL（DDL 在 `scheduled-tasks`）。

## 数据

权威 migration：`scheduled-tasks` → `20260724_family_mental_accounts_show_linked.sql`

| 列                   | 类型    | 约束                  |
| -------------------- | ------- | --------------------- |
| show_linked_accounts | boolean | NOT NULL DEFAULT true |

领域：`FamilyMentalAccount.showLinkedAccounts` ↔ `show_linked_accounts`。

## 时间进度

```
timePercent = clamp((today − start) / (target − start), 0, 1)
起止同日：today ≥ start → 1，否则 0
```

存款进度用 `chartPercent`（已封顶 [0,1]）。按展示到百分号两位后比较：

| 关系        | 文案           |
| ----------- | -------------- |
| 存款 > 时间 | 你们好棒棒     |
| 存款 < 时间 | 需要抓紧存钱啦 |
| 相等        | 继续保持哦     |

UI：`时间进度 xx.xx%` + 鼓励文案；`showLinkedAccounts === false` 时不渲染关联账户行。

## 账目表

资产 / 负债表增加「创建时间」「更新时间」，格式 `YYYY-MM-DD HH:mm`（本地时区）。名称等省略列提供 hover 全文。
