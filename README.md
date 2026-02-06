# stock-charts - 个人投资复盘图表生成系统

一个基于 Python 的轻量级图表生成框架，用于生成适配 Notion 嵌入的交互式 HTML 图表。

🚀 **已支持 GitHub + Vercel 部署，实时同步到 Notion！**

## 项目架构

```
stock-charts/
├── data/              # JSON 数据源
├── charts/            # 生成的 HTML 图表
├── tasks/             # 独立的生成脚本
├── utils/             # 共享工具
└── requirements.txt   # Python 依赖
```

## 核心特性

- **数据契约校验**: 所有 JSON 必须包含 `metadata` 字段（`chart_type` 和 `version`）
- **单脚本单输出**: 每个脚本独立消费一个 JSON 文件，生成一个 HTML 图表
- **Notion 适配**: 生成的图表可直接嵌入 Notion，支持深色主题
- **预期 vs 实际对比**: 旭日图支持展示预期仓位和实际仓位的差异

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 准备数据

在 `data/` 目录下创建 JSON 文件，必须包含以下结构：

```json
{
  "metadata": {
    "chart_type": "sunburst",
    "version": "1.0"
  },
  "data": {
    "name": "总仓位",
    "expected": 100.0,
    "actual": 100.0,
    "children": [
      {
        "name": "行业A",
        "expected": 30.0,
        "actual": 28.5,
        "children": [...]
      }
    ]
  }
}
```

### 3. 运行生成脚本

```bash
python tasks/sunburst_pos.py
```

生成的 HTML 文件将保存在 `charts/sunburst_pos.html`

### 4. 部署到 Vercel（推荐）

详细部署步骤请参考 [DEPLOYMENT.md](./DEPLOYMENT.md)

**快速部署：**
1. 将代码推送到 GitHub
2. 在 [Vercel](https://vercel.com) 导入项目
3. 自动部署完成

**访问图表：**
```
https://你的域名.vercel.app/chart/position_distribution.json
```

### 5. 嵌入 Notion

1. 在 Notion 中创建 `/embed` 块
2. 输入图表 URL：`https://你的域名.vercel.app/chart/position_distribution.json`
3. 图表将自动加载并适配 Notion 主题

**更新数据：**
- 修改 `data/` 目录下的 JSON 文件
- 推送到 GitHub，Vercel 会自动重新部署
- Notion 中的图表会自动更新（刷新页面即可）

## 数据契约

所有 JSON 数据文件必须遵循以下契约：

### 必需字段

- `metadata.chart_type`: 图表类型（必须与脚本期望的类型匹配）
- `metadata.version`: 数据版本号
- `data.name`: 根节点名称
- `data.expected`: 预期仓位百分比
- `data.actual`: 实际仓位百分比
- `data.children`: 子节点数组（可选）

### 数据契约校验

脚本运行时会自动验证：
- `metadata` 字段存在性
- `chart_type` 是否匹配脚本类型
- `version` 字段存在性

如果校验失败，脚本将抛出 `ValueError` 并停止执行。

## 旭日图说明

### 颜色映射

- **蓝色** (#6366f1): 实际仓位与预期仓位差异 < 5%（符合预期）
- **绿色系**: 实际仓位 > 预期仓位（超配）
- **红色系**: 实际仓位 < 预期仓位（低配）

### 交互功能

- **Hover 提示**: 显示名称、预期仓位、实际仓位和差异
- **点击下钻**: 点击扇形可查看子层级
- **缩放**: 支持鼠标滚轮缩放

## 开发指南

### 添加新的图表类型

1. 在 `tasks/` 目录创建新的脚本（如 `line_signal.py`）
2. 在 `data/` 目录创建对应的 JSON 文件
3. 在 JSON 的 `metadata.chart_type` 中指定新的图表类型
4. 在脚本中调用 `validate_metadata(data, "your_chart_type")`

### 工具函数

#### `utils.json_loader.load_json(file_path)`

加载并解析 JSON 文件。

```python
from utils.json_loader import load_json

data = load_json("data/positions.json")
```

#### `utils.validator.validate_metadata(data, expected_chart_type)`

验证数据契约。

```python
from utils.validator import validate_metadata

validate_metadata(data, "sunburst")  # 如果失败会抛出 ValueError
```

## 文件说明

- `tasks/sunburst_pos.py`: 旭日图生成脚本
- `utils/json_loader.py`: JSON 文件加载工具
- `utils/validator.py`: 数据契约校验工具
- `data/positions.json`: 仓位数据模板

## 许可证

MIT
