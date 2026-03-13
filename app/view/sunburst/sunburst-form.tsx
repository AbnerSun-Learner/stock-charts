/**
 * 旭日图表单组件：提供可视化界面构建旭日图数据
 */
'use client';

import { useState, useCallback, useEffect } from 'react';
import { Form, Input, Button, Space, message } from 'antd';
import { PlusOutlined, DeleteOutlined, SwapOutlined } from '@ant-design/icons';
import type { SunburstNode } from './parse-config-json';

/** 树形节点表单数据类型 */
interface FormNode {
  id: string;
  name: string;
  percentage: string;
  children: FormNode[];
  key: string;
}

/** 生成的 JSON 结构 */
interface GeneratedConfig {
  metadata: { chart_type: string; version: string };
  name: string;
  date: string;
  children: SunburstNode[];
}

/** 生成唯一 ID */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/** 递归转换表单节点为 JSON 节点 */
function formNodeToJson(node: FormNode): SunburstNode {
  return {
    name: node.name,
    percentage: node.percentage,
    children: node.children.length > 0 ? node.children.map(formNodeToJson) : undefined,
  };
}

/** 递归转换 JSON 节点为表单节点 */
function jsonToFormNode(node: SunburstNode, parentKey: string, index: number): FormNode {
  const key = `${parentKey}-${index}`;
  return {
    id: generateId(),
    name: node.name,
    percentage: node.percentage || '',
    children: node.children ? node.children.map((c, i) => jsonToFormNode(c, key, i)) : [],
    key,
  };
}

/** 初始化根节点 */
function createRootNode(): FormNode {
  return {
    id: generateId(),
    name: '',
    percentage: '',
    children: [],
    key: '0',
  };
}

/** 节点编辑表单组件 */
function NodeFormItem({
  node,
  onChange,
  onDelete,
  depth = 0,
}: {
  node: FormNode;
  onChange: (node: FormNode) => void;
  onDelete: () => void;
  depth?: number;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...node, name: e.target.value });
  };

  const handlePercentageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...node, percentage: e.target.value });
  };

  const handleAddChild = () => {
    const newChild: FormNode = {
      id: generateId(),
      name: '',
      percentage: '',
      children: [],
      key: `${node.key}-${node.children.length}`,
    };
    onChange({ ...node, children: [...node.children, newChild] });
  };

  const handleChildChange = (index: number, child: FormNode) => {
    const newChildren = [...node.children];
    newChildren[index] = child;
    onChange({ ...node, children: newChildren });
  };

  const handleChildDelete = (index: number) => {
    const newChildren = node.children.filter((_, i) => i !== index);
    onChange({ ...node, children: newChildren });
  };

  const indentStyle = {
    marginLeft: depth * 24,
  };

  return (
    <div
      className="border border-[var(--border-subtle)] rounded-lg p-3 mb-2 bg-[var(--bg-elevated)]"
      style={indentStyle}
    >
      <div className="flex flex-wrap gap-2 items-end">
        <Form.Item
          label={`${depth + 1}级分类`}
          className="mb-0 min-w-[120px]"
          required={depth === 0}
        >
          <Input
            placeholder="分类名称"
            value={node.name}
            onChange={handleNameChange}
            style={{ width: '100%' }}
          />
        </Form.Item>
        <Form.Item label="占比" className="mb-0 min-w-[100px]">
          <Input
            placeholder="如 30%"
            value={node.percentage}
            onChange={handlePercentageChange}
            style={{ width: '100%' }}
          />
        </Form.Item>
        <Space className="mb-0">
          {depth < 2 && (
            <Button
              type="text"
              icon={<PlusOutlined />}
              onClick={handleAddChild}
              size="small"
            >
              添加子节点
            </Button>
          )}
          {depth > 0 && (
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={onDelete}
              size="small"
            >
              删除
            </Button>
          )}
          {node.children.length > 0 && (
            <Button
              type="text"
              size="small"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? '展开' : '折叠'}子节点
            </Button>
          )}
        </Space>
      </div>

      {!collapsed && node.children.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
          {node.children.map((child, index) => (
            <NodeFormItem
              key={child.id}
              node={child}
              onChange={(updated) => handleChildChange(index, updated)}
              onDelete={() => handleChildDelete(index)}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** 旭日图表单组件 */
export default function SunburstForm({
  onGenerateJson,
  initialJson,
}: {
  onGenerateJson: (json: string) => void;
  initialJson?: string | null;
}) {
  const [chartName, setChartName] = useState('资产配置');
  const [chartDate, setChartDate] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [nodes, setNodes] = useState<FormNode[]>([createRootNode()]);
  const [previewJson, setPreviewJson] = useState<string | null>(null);

  // 从初始 JSON 导入数据
  useEffect(() => {
    if (initialJson) {
      try {
        const parsed = JSON.parse(initialJson) as {
          name?: string;
          date?: string;
          children?: SunburstNode[];
        };
        if (parsed.name) setChartName(parsed.name);
        if (parsed.date) setChartDate(parsed.date);
        if (parsed.children && Array.isArray(parsed.children)) {
          setNodes(parsed.children.map((c, i) => jsonToFormNode(c, '0', i)));
        }
      } catch {
        // ignore parse error
      }
    }
  }, [initialJson]);

  const handleAddNode = () => {
    const newNode: FormNode = {
      id: generateId(),
      name: '',
      percentage: '',
      children: [],
      key: `${nodes.length}`,
    };
    setNodes([...nodes, newNode]);
  };

  const handleNodeChange = (index: number, node: FormNode) => {
    const newNodes = [...nodes];
    newNodes[index] = node;
    setNodes(newNodes);
  };

  const handleNodeDelete = (index: number) => {
    setNodes(nodes.filter((_, i) => i !== index));
  };

  // 生成配置对象（供预览和生成 JSON 共用）
  const buildConfig = useCallback((): GeneratedConfig | null => {
    const validNodes = nodes.filter((n) => n.name.trim());
    if (validNodes.length === 0) {
      return null;
    }
    return {
      metadata: {
        chart_type: 'sunburst',
        version: '1.0',
      },
      name: chartName,
      date: chartDate,
      children: validNodes.map(formNodeToJson),
    };
  }, [nodes, chartName, chartDate]);

  const handleGenerateJson = useCallback(() => {
    const config = buildConfig();
    if (!config) {
      message.error('请至少添加一个分类名称');
      return;
    }
    const jsonStr = JSON.stringify(config, null, 2);
    setPreviewJson(jsonStr);
    onGenerateJson(jsonStr);
    message.success('已生成 JSON');
  }, [buildConfig, onGenerateJson]);

  const handlePreviewJson = useCallback(() => {
    const config = buildConfig();
    if (!config) {
      message.error('请至少添加一个分类名称');
      return;
    }
    setPreviewJson(JSON.stringify(config, null, 2));
  }, [buildConfig]);

  return (
    <div className="sunburst-form">
      {/* 基本信息区 */}
      <div className="mb-6 p-4 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl">
        <h3 className="font-[var(--font-body)] text-sm font-semibold text-[var(--text-secondary)] mb-4">
          基本信息
        </h3>
        <div className="flex flex-wrap gap-4">
          <Form.Item label="图表名称" className="mb-0">
            <Input
              placeholder="如 资产配置"
              value={chartName}
              onChange={(e) => setChartName(e.target.value)}
              style={{ width: 200 }}
            />
          </Form.Item>
          <Form.Item label="日期" className="mb-0">
            <Input
              type="date"
              value={chartDate}
              onChange={(e) => setChartDate(e.target.value)}
              style={{ width: 180 }}
            />
          </Form.Item>
        </div>
      </div>

      {/* 节点编辑区 */}
      <div className="mb-6 p-4 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-[var(--font-body)] text-sm font-semibold text-[var(--text-secondary)] m-0">
            分类节点
          </h3>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddNode}
            size="small"
          >
            添加一级分类
          </Button>
        </div>

        {nodes.length === 0 && (
          <p className="text-[var(--text-muted)] text-sm text-center py-8">
            点击「添加一级分类」开始构建
          </p>
        )}

        {nodes.map((node, index) => (
          <NodeFormItem
            key={node.id}
            node={node}
            onChange={(updated) => handleNodeChange(index, updated)}
            onDelete={() => handleNodeDelete(index)}
            depth={0}
          />
        ))}
      </div>

      {/* 操作按钮 */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button
          icon={<SwapOutlined />}
          onClick={handlePreviewJson}
          disabled={nodes.length === 0}
        >
          预览 JSON
        </Button>
        <Button
          type="primary"
          onClick={handleGenerateJson}
          disabled={nodes.length === 0}
        >
          生成 JSON 并生成图表
        </Button>
      </div>

      {/* JSON 预览区 */}
      {previewJson && (
        <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl">
          <h3 className="font-[var(--font-body)] text-sm font-semibold text-[var(--text-secondary)] mb-3">
            JSON 预览
          </h3>
          <pre className="text-xs font-mono bg-[var(--bg-elevated)] p-3 rounded-lg overflow-x-auto max-h-[300px] overflow-y-auto">
            {previewJson}
          </pre>
        </div>
      )}
    </div>
  );
}