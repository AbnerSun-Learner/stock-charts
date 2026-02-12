"""
Vercel Serverless Function for generating sunburst charts
访问方式: /api/chart?filename=position_distribution.json 或 /chart/position_distribution.json
"""
import json
import sys
import os
import tempfile
import urllib.parse
from pathlib import Path

# 添加项目根目录到路径
# Vercel 上文件在 /var/task/ 目录下
if Path('/var/task').exists():
    # Vercel 环境
    project_root = Path('/var/task')
else:
    # 本地环境
    project_root = Path(__file__).parent.parent

sys.path.insert(0, str(project_root))

from tasks.sunburst_pos import generate_sunburst, optimize_html_for_notion
from utils.json_loader import load_json
from utils.validator import validate_metadata


def handler(request_dict):
    """处理请求并生成图表"""
    # 从请求中获取文件名
    filename = None
    
    # 从 query string 获取
    query = request_dict.get('query', {})
    if isinstance(query, dict):
        filename = query.get('filename')
    
    # 从 URL path 获取
    if not filename:
        path = request_dict.get('path', '')
        if path:
            path_parts = [p for p in path.strip('/').split('/') if p]
            if len(path_parts) >= 2 and path_parts[0] == 'chart':
                filename = path_parts[1]
    
    # 从 URL 获取
    if not filename:
        url = request_dict.get('url', '')
        if url:
            parsed = urllib.parse.urlparse(url)
            path_parts = [p for p in parsed.path.strip('/').split('/') if p]
            if len(path_parts) >= 2 and path_parts[0] == 'chart':
                filename = path_parts[1]
            # 也从 query string 获取
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
            "body": f"<html><body><h1>404 - 文件未找到</h1><p>数据文件 {filename} 不存在</p><p>路径: {data_file}</p></body></html>"
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
                    "X-Frame-Options": "ALLOWALL",
                    "Access-Control-Allow-Origin": "*"
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


# Vercel Python runtime 入口函数
# request 参数是字典格式: {'path': '/chart/xxx', 'query': {}, 'headers': {}, 'url': '...'}
def main(request):
    """Vercel serverless function entry point"""
    # 确保 request 是字典
    if not isinstance(request, dict):
        request = {
            'path': getattr(request, 'path', ''),
            'query': getattr(request, 'query', {}) if hasattr(request, 'query') else {},
            'url': getattr(request, 'url', ''),
            'headers': getattr(request, 'headers', {}) if hasattr(request, 'headers') else {}
        }
    
    return handler(request)
