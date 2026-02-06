"""JSON 文件加载工具"""
import json
from pathlib import Path
from typing import Dict, Any


def load_json(file_path: str) -> Dict[str, Any]:
    """
    加载 JSON 文件并返回解析后的字典
    
    Args:
        file_path: JSON 文件路径（相对或绝对路径）
    
    Returns:
        解析后的 JSON 字典
    
    Raises:
        FileNotFoundError: 文件不存在
        json.JSONDecodeError: JSON 格式错误
    """
    path = Path(file_path)
    
    if not path.exists():
        raise FileNotFoundError(f"JSON 文件不存在: {file_path}")
    
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    return data
