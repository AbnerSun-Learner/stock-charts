"""数据契约校验工具"""
from typing import Dict, Any


def validate_metadata(data: Dict[str, Any], expected_chart_type: str) -> None:
    """
    验证 JSON 数据的 metadata 字段
    
    Args:
        data: 解析后的 JSON 数据字典
        expected_chart_type: 期望的图表类型（如 "sunburst"）
    
    Raises:
        ValueError: 当 metadata 缺失、chart_type 不匹配或 version 缺失时
    """
    # 检查 metadata 字段是否存在
    if 'metadata' not in data:
        raise ValueError(
            "数据契约校验失败: 缺少必需的 'metadata' 字段"
        )
    
    metadata = data['metadata']
    
    # 检查 chart_type 字段
    if 'chart_type' not in metadata:
        raise ValueError(
            "数据契约校验失败: metadata 中缺少必需的 'chart_type' 字段"
        )
    
    # 检查 chart_type 是否匹配
    actual_chart_type = metadata['chart_type']
    if actual_chart_type != expected_chart_type:
        raise ValueError(
            f"数据契约校验失败: chart_type 不匹配。"
            f"期望: '{expected_chart_type}', 实际: '{actual_chart_type}'"
        )
    
    # 检查 version 字段
    if 'version' not in metadata:
        raise ValueError(
            "数据契约校验失败: metadata 中缺少必需的 'version' 字段"
        )
    
    # 验证通过，无返回值
