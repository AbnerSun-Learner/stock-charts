"""
旭日图生成脚本 - 使用 Pyecharts 展示预期仓位 vs 实际仓位
适配 Notion 嵌入，使用深色主题和优化样式
"""
import sys
from pathlib import Path
from pyecharts import options as opts
from pyecharts.charts import Sunburst
from pyecharts.globals import ThemeType

# 添加项目根目录到路径，以便导入 utils
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from utils.json_loader import load_json
from utils.validator import validate_metadata
from pyecharts.commons.utils import JsCode


def get_color_for_category(name, depth):
    """
    根据分类名称和深度返回颜色
    
    Args:
        name: 分类名称
        depth: 层级深度（0=第一层，1=第二层，2=第三层）
    
    Returns:
        颜色字符串
    """
    # 第一层颜色方案（主要分类）
    first_level_colors = {
        "A股": "#4A90E2",      # 蓝色
        "货币": "#50C878",      # 绿色
        "香港": "#FF6B6B",     # 红色
        "海外新兴": "#FF6B6B",   # 红色
        "债券": "#9B59B6",      # 紫色
        "海外成熟": "#F39C12",   # 橙色
    }
    
    # 如果是指定的第一层分类，使用对应颜色
    if depth == 0 and name in first_level_colors:
        return first_level_colors[name]
    
    # 其他情况使用渐变色
    colors = ["#64B5F6", "#81C784", "#FFB74D", "#BA68C8", "#4DB6AC", "#FF8A65"]
    color_index = hash(name) % len(colors)
    return colors[color_index]


def parse_percentage(percentage_str):
    """
    从百分比字符串中提取数值
    
    Args:
        percentage_str: 百分比字符串，如 "50.16%"
    
    Returns:
        浮点数值
    """
    if isinstance(percentage_str, str):
        return float(percentage_str.replace('%', ''))
    return float(percentage_str) if percentage_str else 0.0


def build_sunburst_data(node, depth=0):
    """
    递归构建 Pyecharts 旭日图所需的数据结构
    使用 shares（份数）和 percentage（市值占比）
    
    Args:
        node: 当前节点数据字典
        depth: 当前层级深度
    
    Returns:
        Pyecharts 旭日图数据字典
    """
    # 从 percentage 中提取数值作为 value（用于扇形大小）
    percentage = node.get('percentage', '0%')
    value = parse_percentage(percentage)
    
    # 获取份数
    shares = node.get('shares', 0)
    
    # 验证数据：如果有子节点，检查数据一致性
    if 'children' in node and node['children']:
        children_shares = sum(c.get('shares', 0) for c in node['children'])
        children_pct = sum(parse_percentage(c.get('percentage', '0%')) for c in node['children'])
        
        # 如果 shares 不匹配，使用子节点总和
        if abs(shares - children_shares) > 0.1:
            shares = children_shares
        
        # 如果 percentage 不匹配，使用子节点总和
        if abs(value - children_pct) > 0.5:
            value = children_pct
            percentage = f"{children_pct:.2f}%"
    
    # 根据分类和深度获取颜色
    color = get_color_for_category(node['name'], depth)
    
    # 构建节点数据
    node_data = {
        "name": node['name'],  # 原始名称
        "value": value,
        "itemStyle": {"color": color},
        # 存储份数和百分比用于标签显示
        "shares": shares,
        "percentage": percentage
    }
    
    # 处理子节点
    if 'children' in node and node['children']:
        node_data["children"] = []
        for child in node['children']:
            child_data = build_sunburst_data(child, depth + 1)
            node_data["children"].append(child_data)
    
    return node_data


def generate_sunburst(data_dict):
    """
    生成 Pyecharts 旭日图（三层结构，跳过根节点）
    
    Args:
        data_dict: JSON 数据字典（可能包含 data 字段，或直接是根节点）
    
    Returns:
        Pyecharts Sunburst 图表对象
    """
    # 直接使用根节点数据
    root_data = data_dict
    
    # 跳过根节点，直接从第一层 children 开始构建数据
    # 这样就不会显示"长赢150"这个根节点
    chart_data = []
    if 'children' in root_data and root_data['children']:
        for child in root_data['children']:
            chart_data.append(build_sunburst_data(child, depth=0))
    
    # 创建旭日图
    sunburst = (
        Sunburst(init_opts=opts.InitOpts(
            theme=ThemeType.MACARONS,  # 使用浅色主题
            bg_color="#ffffff",  # 浅色背景
            width="100%",
            height="800px",
            page_title="仓位分布"
        ))
        .add(
            series_name="",
            data_pair=chart_data,  # 直接使用列表，不需要嵌套
            radius=[0, "95%"],
            center=["50%", "50%"],
            highlight_policy="ancestor",
            levels=[
                {},  # 第一层（A股、货币、海外新兴等）
                {
                    "r0": "15%",
                    "r": "50%",
                    "itemStyle": {"borderWidth": 2, "borderColor": "rgba(0, 0, 0, 0.2)"},
                    "label": {
                        "rotate": "tangential",  # 使用切线方向
                        "fontSize": 11,
                        "color": "#333333"
                    }
                },
                {
                    "r0": "50%",
                    "r": "80%",
                    "itemStyle": {"borderWidth": 1.5, "borderColor": "rgba(0, 0, 0, 0.15)"},
                    "label": {
                        "rotate": "radial",  # 使用径向方向
                        "fontSize": 9,
                        "color": "#333333"
                    }
                },
                {
                    "r0": "80%",
                    "r": "95%",
                    "itemStyle": {"borderWidth": 1, "borderColor": "rgba(0, 0, 0, 0.1)"},
                    "label": {
                        "rotate": "radial",  # 使用径向方向
                        "fontSize": 8,
                        "color": "#333333"
                    }
                }
            ],
            label_opts=opts.LabelOpts(
                is_show=True,
                color="#333333",  # 深色字体，适配浅色背景
                font_size=10,
                # 简化标签显示，避免复杂的 formatter 导致 JSON 解析错误
                formatter="{b}\n【{c}】 {d}%"
            ),
            tooltip_opts=opts.TooltipOpts(
                trigger="item",
                formatter="{b}"
            )
        )
        .set_global_opts(
            title_opts=opts.TitleOpts(
                title="仓位分布",
                title_textstyle_opts=opts.TextStyleOpts(
                    color="#333333",  # 深色字体，适配浅色背景
                    font_size=18,  # 减小标题字体
                    font_family="'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
                    font_weight="600"
                ),
                pos_left="left",  # 左侧对齐
                pos_top="20"  # 距离顶部 20px
            ),
            legend_opts=opts.LegendOpts(is_show=False)
        )
    )
    
    return sunburst




def main():
    """主函数"""
    import argparse
    
    # 解析命令行参数
    parser = argparse.ArgumentParser(description='生成旭日图')
    parser.add_argument(
        '--file', '-f',
        type=str,
        default='position_distribution.json',
        help='数据文件名（位于 data/ 目录下），默认为 position_distribution.json'
    )
    args = parser.parse_args()
    
    # 确保文件名以 .json 结尾
    filename = args.file
    if not filename.endswith('.json'):
        filename += '.json'
    
    # 文件路径 - 从 data 目录读取
    data_file = project_root / "data" / filename
    output_file = project_root / "charts" / "sunburst_pos.html"
    
    # 确保输出目录存在
    output_file.parent.mkdir(parents=True, exist_ok=True)
    
    try:
        # 加载 JSON 数据
        print(f"正在加载数据: {data_file}")
        data = load_json(str(data_file))
        
        # 新格式不需要验证 metadata（可能没有这个字段）
        # 如果存在 metadata，则验证
        if 'metadata' in data:
            print("正在验证数据契约...")
            validate_metadata(data, "sunburst")
            print("✓ 数据契约验证通过")
        
        # 生成图表
        print("正在生成旭日图...")
        chart = generate_sunburst(data)
        
        # 保存为 HTML（使用 Notion 适配的配置）
        print(f"正在保存图表: {output_file}")
        chart.render(
            path=str(output_file),
            template_name="simple_chart.html",  # 使用简单模板，适合 Notion 嵌入
        )
        
        # 优化生成的 HTML 以适配 Notion
        optimize_html_for_notion(output_file, data)
        
        print(f"✓ 图表已成功生成: {output_file}")
        
    except FileNotFoundError as e:
        print(f"❌ 错误: {e}", file=sys.stderr)
        sys.exit(1)
    except ValueError as e:
        print(f"❌ 数据契约校验失败: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"❌ 生成图表时发生错误: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


def optimize_html_for_notion(html_file, data_dict):
    """
    优化 HTML 文件以适配 Notion 嵌入，使用 frontend-design 原则优化样式
    
    Args:
        html_file: HTML 文件路径
        data_dict: 原始数据字典（用于 tooltip）
    """
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 使用浅色主题样式
    notion_style = """
    <style>
        * {
            box-sizing: border-box;
        }
        
        body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            overflow: hidden;
        }
        
        /* 优化图表容器 */
        .chart-container {
            width: 100vw !important;
            height: 100vh !important;
            min-height: 800px;
            margin: 0;
            padding: 0;
            position: relative;
            background: #ffffff;
        }
        
        /* 优化 ECharts 容器 */
        div[id^="_echarts"] {
            width: 100% !important;
            height: 100% !important;
        }
        
        /* 优化 tooltip 样式 - 浅色主题 */
        .echarts-tooltip {
            background: rgba(255, 255, 255, 0.95) !important;
            border: 1px solid rgba(0, 0, 0, 0.15) !important;
            border-radius: 8px !important;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15) !important;
            backdrop-filter: blur(10px) !important;
            padding: 12px 16px !important;
            color: #333333 !important;
        }
        
        /* 响应式设计 */
        @media (max-width: 768px) {
            .chart-container {
                min-height: 600px;
            }
        }
    </style>
    """
    
    # 在 </head> 之前插入样式
    if '</head>' in content:
        content = content.replace('</head>', notion_style + '</head>')
    
    # 确保 body 有正确的背景色和样式 - 浅色背景
    if '<body>' in content:
        content = content.replace('<body>', '<body style="background-color: #ffffff; margin: 0; padding: 0; overflow: hidden;">')
    
    # 替换背景色为浅色
    content = content.replace('"backgroundColor": "#191919"', '"backgroundColor": "#ffffff"')
    
    # 修复标签 formatter，使其正确显示 shares 和 percentage
    import re
    chart_var_match = re.search(r'var (chart_\w+) = echarts\.init', content)
    if chart_var_match:
        chart_var = chart_var_match.group(1)
        
        # 添加 JavaScript 来修复标签格式化
        fix_formatter_script = f"""
        // 修复标签格式化，正确显示 shares 和 percentage
        (function() {{
            setTimeout(function() {{
                var chart = {chart_var};
                if (chart) {{
                    var option = chart.getOption();
                    if (option && option.series && option.series[0] && option.series[0].label) {{
                        option.series[0].label.formatter = function(params) {{
                            var data = params.data;
                            var name = data.name || '';
                            var shares = data.shares || 0;
                            var percentage = data.percentage || '0%';
                            return name + '\\n【' + shares + '】 ' + percentage;
                        }};
                        chart.setOption(option, true);
                    }}
                }}
            }}, 100);
        }})();
        """
        
        # 在 window.addEventListener 之前插入脚本
        resize_pattern = 'window.addEventListener('
        if resize_pattern in content:
            idx = content.find(resize_pattern)
            if idx > 0:
                line_start = content.rfind('\n', 0, idx)
                if line_start >= 0:
                    indent = content[line_start+1:idx]
                    content = content[:idx] + fix_formatter_script + indent + content[idx:]
    
    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(content)


if __name__ == "__main__":
    main()
