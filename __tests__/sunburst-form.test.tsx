/**
 * 旭日图表单组件测试
 */
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SunburstForm from '../app/view/sunburst/sunburst-form';

// Mock matchMedia for Ant Design
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock message
jest.mock('antd', () => {
  const actual = jest.requireActual('antd');
  return {
    ...actual,
    message: {
      success: jest.fn(),
      error: jest.fn(),
    },
  };
});

describe('SunburstForm', () => {
  const mockOnGenerateJson = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('渲染基本表单元素', () => {
    render(<SunburstForm onGenerateJson={mockOnGenerateJson} />);

    expect(screen.getByPlaceholderText('如 资产配置')).toBeInTheDocument();
    expect(screen.getByText('添加一级分类')).toBeInTheDocument();
  });

  it('默认值设置正确', () => {
    render(<SunburstForm onGenerateJson={mockOnGenerateJson} />);

    const nameInput = screen.getByPlaceholderText('如 资产配置') as HTMLInputElement;
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;

    expect(nameInput.value).toBe('资产配置');
    expect(dateInput.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('可以添加一级分类节点', async () => {
    render(<SunburstForm onGenerateJson={mockOnGenerateJson} />);

    // 初始已有一个节点，点击添加按钮后会有两个
    const addButton = screen.getByText('添加一级分类');
    fireEvent.click(addButton);

    // 应该有2个一级分类
    expect(screen.getAllByText('1级分类')).toHaveLength(2);
  });

  it('可以添加子节点', async () => {
    render(<SunburstForm onGenerateJson={mockOnGenerateJson} />);

    // 初始已有节点，输入名称
    const nameInput = screen.getAllByPlaceholderText('分类名称')[0];
    fireEvent.change(nameInput, { target: { value: 'A股' } });

    // 添加子节点 - 使用第一个添加子节点按钮
    const addChildButtons = screen.getAllByText('添加子节点');
    fireEvent.click(addChildButtons[0]);

    expect(screen.getByText('2级分类')).toBeInTheDocument();
  });

  it('验证：未填写名称时显示错误', async () => {
    const { message } = require('antd');
    render(<SunburstForm onGenerateJson={mockOnGenerateJson} />);

    // 初始节点为空，点击生成 JSON 按钮
    const generateButton = screen.getByText('生成 JSON 并生成图表');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('请至少添加一个分类名称');
    });
  });

  it('成功生成 JSON', async () => {
    render(<SunburstForm onGenerateJson={mockOnGenerateJson} />);

    // 使用第一个节点并填写名称
    const nameInput = screen.getAllByPlaceholderText('分类名称')[0];
    fireEvent.change(nameInput, { target: { value: 'A股' } });

    // 填写占比
    const pctInput = screen.getAllByPlaceholderText('如 30%')[0];
    fireEvent.change(pctInput, { target: { value: '50%' } });

    // 点击生成按钮
    const generateButton = screen.getByText('生成 JSON 并生成图表');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(mockOnGenerateJson).toHaveBeenCalled();
    });

    const generatedJson = mockOnGenerateJson.mock.calls[0][0];
    const parsed = JSON.parse(generatedJson);
    expect(parsed.name).toBe('资产配置');
    expect(parsed.children).toHaveLength(1);
    expect(parsed.children[0].name).toBe('A股');
    expect(parsed.children[0].percentage).toBe('50%');
  });

  it('支持从初始 JSON 导入', () => {
    const initialJson = JSON.stringify({
      name: '测试配置',
      date: '2026-01-01',
      children: [
        { name: '股票', percentage: '60%', children: [{ name: 'A股', percentage: '40%' }] },
      ],
    });

    render(<SunburstForm onGenerateJson={mockOnGenerateJson} initialJson={initialJson} />);

    // 检查初始 JSON 导入是否成功 - 验证节点被正确加载
    const nodes = screen.getAllByPlaceholderText('分类名称');
    // 应该有一个一级节点和一个二级节点
    expect(nodes).toHaveLength(2);
  });

  it('可以添加多个一级分类', () => {
    render(<SunburstForm onGenerateJson={mockOnGenerateJson} />);

    // 初始已有1个节点
    expect(screen.getAllByText('1级分类')).toHaveLength(1);

    // 添加第二个节点
    const addButton = screen.getByText('添加一级分类');
    fireEvent.click(addButton);

    // 确认两个节点
    expect(screen.getAllByText('1级分类')).toHaveLength(2);

    // 再添加第三个
    fireEvent.click(addButton);
    expect(screen.getAllByText('1级分类')).toHaveLength(3);
  });

  it('可以删除子节点', () => {
    render(<SunburstForm onGenerateJson={mockOnGenerateJson} />);

    // 初始节点添加子节点
    const addChildButton = screen.getAllByText('添加子节点')[0];
    fireEvent.click(addChildButton);

    // 确认子节点存在
    expect(screen.getByText('2级分类')).toBeInTheDocument();

    // 找到并点击子节点的删除按钮
    const deleteButton = screen.getAllByText('删除').pop();
    if (deleteButton) {
      fireEvent.click(deleteButton);
    }

    // 确认子节点已删除
    expect(screen.queryByText('2级分类')).not.toBeInTheDocument();
  });

  it('支持预览 JSON 功能', () => {
    render(<SunburstForm onGenerateJson={mockOnGenerateJson} />);

    // 使用第一个节点
    const nameInput = screen.getAllByPlaceholderText('分类名称')[0];
    fireEvent.change(nameInput, { target: { value: '债券' } });

    // 点击预览按钮
    const previewButton = screen.getByText('预览 JSON');
    fireEvent.click(previewButton);

    // 确认 JSON 预览区域出现
    expect(screen.getByText('JSON 预览')).toBeInTheDocument();
  });

  it('生成的 JSON 包含正确的 metadata', () => {
    render(<SunburstForm onGenerateJson={mockOnGenerateJson} />);

    // 使用第一个节点
    const nameInput = screen.getAllByPlaceholderText('分类名称')[0];
    fireEvent.change(nameInput, { target: { value: '货币' } });

    // 生成 JSON
    const generateButton = screen.getByText('生成 JSON 并生成图表');
    fireEvent.click(generateButton);

    const generatedJson = mockOnGenerateJson.mock.calls[0][0];
    const parsed = JSON.parse(generatedJson);

    expect(parsed.metadata).toEqual({
      chart_type: 'sunburst',
      version: '1.0',
    });
  });

  it('支持多级嵌套结构', () => {
    render(<SunburstForm onGenerateJson={mockOnGenerateJson} />);

    // 添加一级分类
    const addButton = screen.getByText('添加一级分类');
    fireEvent.click(addButton);

    // 填写一级节点名称
    const nameInputs = screen.getAllByPlaceholderText('分类名称');
    fireEvent.change(nameInputs[0], { target: { value: 'A股' } });

    // 添加二级子节点
    const addChildButtons = screen.getAllByText('添加子节点');
    fireEvent.click(addChildButtons[0]);

    // 填写二级节点名称
    const updatedNameInputs = screen.getAllByPlaceholderText('分类名称');
    fireEvent.change(updatedNameInputs[1], { target: { value: '科技' } });

    // 添加三级子节点
    const addChildButtons2 = screen.getAllByText('添加子节点');
    fireEvent.click(addChildButtons2[1]);

    // 现在应该有三级分类标签
    expect(screen.getByText('3级分类')).toBeInTheDocument();

    // 生成并验证
    const generateButton = screen.getByText('生成 JSON 并生成图表');
    fireEvent.click(generateButton);

    const generatedJson = mockOnGenerateJson.mock.calls[0][0];
    const parsed = JSON.parse(generatedJson);

    expect(parsed.children[0].children[0].children).toBeDefined();
  });
});
