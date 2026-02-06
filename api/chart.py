"""
Vercel Serverless Function for generating sunburst charts
访问方式: /api/chart?filename=position_distribution.json 或 /chart/position_distribution.json
"""
import json
import sys
import os
import tempfile
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from tasks.sunburst_pos import generate_sunburst, optimize_html_for_notion
from utils.json_loader import load_json
from utils.validator import validate_metadata


def handler(request):
    """Vercel serverless function handler"""
    # 从 URL 参数或路径中获取文件名
    filename = None
    
    # Vercel 会将 query string 参数传递给 request
    # 尝试从 query string 获取
    if hasattr(request, 'args') and request.args:
        filename = request.args.get('filename')
    elif hasattr(request, 'query') and request.query:
        filename = request.query.get('filename')
    
    # 尝试从 URL path 获取（通过 vercel.json 路由配置）
    if not filename:
        if hasattr(request, 'path') and request.path:
            # 从路径中提取文件名，例如 /chart/position_distribution.json
            path_parts = [p for p in request.path.strip('/').split('/') if p]
            if len(path_parts) > 1:
                filename = path_parts[-1]
        elif hasattr(request, 'url'):
            # 从完整 URL 中提取
            import urllib.parse
            parsed = urllib.parse.urlparse(request.url)
            path_parts = [p for p in parsed.path.strip('/').split('/') if p]
            if len(path_parts) > 1:
                filename = path_parts[-1]
            # 也检查 query string
            if not filename:
                query_params = urllib.parse.parse_qs(parsed.query)
                if 'filename' in query_params:
                    filename = query_params['filename'][0]
    
    # 默认文件名
    if not filename:
        filename = 'position_distribution.json'
    
    # 确保文件名以 .json 结尾
    if not filename.endswith('.json'):
        filename += '.json'
    
    # 构建数据文件路径
    data_file = project_root / "data" / filename
    
    # 检查文件是否存在
    if not data_file.exists():
        return {
            "statusCode": 404,
            "headers": {
                "Content-Type": "text/html; charset=utf-8"
            },
            "body": f"<html><body><h1>404 - 文件未找到</h1><p>数据文件 {filename} 不存在</p></body></html>"
        }
    
    try:
        # 加载 JSON 数据
        data = load_json(str(data_file))
        
        # 如果存在 metadata，则验证
        if 'metadata' in data:
            validate_metadata(data, "sunburst")
        
        # 生成图表
        chart = generate_sunburst(data)
        
        # 生成 HTML（使用临时文件）
        with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False, encoding='utf-8') as tmp_file:
            tmp_path = tmp_file.name
        
        try:
            chart.render(
                path=tmp_path,
                template_name="simple_chart.html",
            )
            
            # 优化 HTML 以适配 Notion
            optimize_html_for_notion(tmp_path, data)
            
            # 读取生成的 HTML
            with open(tmp_path, 'r', encoding='utf-8') as f:
                html_content = f.read()
            
            # 清理临时文件
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
            
            return {
                "statusCode": 200,
                "headers": {
                    "Content-Type": "text/html; charset=utf-8",
                    "X-Frame-Options": "ALLOWALL",  # 允许嵌入 iframe (Notion)
                    "Access-Control-Allow-Origin": "*"  # 允许跨域
                },
                "body": html_content
            }
            
        except Exception as e:
            # 确保清理临时文件
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
            raise e
            
    except FileNotFoundError as e:
        return {
            "statusCode": 404,
            "headers": {
                "Content-Type": "text/html; charset=utf-8"
            },
            "body": f"<html><body><h1>404 - 文件未找到</h1><p>{str(e)}</p></body></html>"
        }
    except ValueError as e:
        return {
            "statusCode": 400,
            "headers": {
                "Content-Type": "text/html; charset=utf-8"
            },
            "body": f"<html><body><h1>400 - 数据验证失败</h1><p>{str(e)}</p></body></html>"
        }
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "text/html; charset=utf-8"
            },
            "body": f"<html><body><h1>500 - 服务器错误</h1><pre>{error_msg}</pre></body></html>"
        }


# Vercel 使用这个函数
def main(request):
    return handler(request)
