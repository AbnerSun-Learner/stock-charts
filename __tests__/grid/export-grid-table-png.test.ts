import {
  captureElementAsPngDataUrl,
  downloadDataUrlPng,
  exportGridTablePng,
  formatExportDate,
  GRID_TABLE_EXPORT_EXT,
  GRID_TABLE_EXPORT_PREFIX,
} from '@/lib/grid/export-grid-table-png';
import { domToPng } from 'modern-screenshot';

jest.mock('modern-screenshot', () => ({
  domToPng: jest.fn(),
}));

const mockedDomToPng = domToPng as jest.MockedFunction<typeof domToPng>;

describe('export-grid-table-png', () => {
  beforeEach(() => {
    mockedDomToPng.mockReset();
    mockedDomToPng.mockResolvedValue('data:image/png;base64,mock');
  });

  it('formatExportDate 应输出 YYYYMMDD', () => {
    expect(formatExportDate(new Date(2026, 6, 3))).toBe('20260703');
  });

  it('导出文件名前缀与扩展名应正确', () => {
    const filename = `${GRID_TABLE_EXPORT_PREFIX}${formatExportDate(new Date(2026, 6, 3))}${GRID_TABLE_EXPORT_EXT}`;
    expect(filename).toBe('网格策略-20260703.png');
  });

  it('captureElementAsPngDataUrl 应调用 domToPng 并恢复样式', async () => {
    const outer = document.createElement('div');
    const scrollContainer = document.createElement('div');
    scrollContainer.setAttribute('aria-label', '网格结果表，可横向滚动');
    Object.defineProperty(scrollContainer, 'scrollWidth', { value: 960 });
    Object.defineProperty(scrollContainer, 'scrollHeight', { value: 480 });
    outer.appendChild(scrollContainer);
    document.body.appendChild(outer);

    scrollContainer.style.overflow = 'auto';
    scrollContainer.style.width = '100%';

    const dataUrl = await captureElementAsPngDataUrl(outer);

    expect(mockedDomToPng).toHaveBeenCalledWith(
      scrollContainer,
      expect.objectContaining({
        backgroundColor: '#ffffff',
        scale: 2,
        width: 960,
        height: 480,
      })
    );
    expect(dataUrl).toBe('data:image/png;base64,mock');
    expect(scrollContainer.style.overflow).toBe('auto');
    expect(scrollContainer.style.width).toBe('100%');

    outer.remove();
  });

  it('downloadDataUrlPng 应触发下载链接', () => {
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click');

    downloadDataUrlPng('data:image/png;base64,abc', '网格策略-20260703.png');

    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('exportGridTablePng 在 domToPng 失败时应抛出错误', async () => {
    mockedDomToPng.mockRejectedValueOnce(new Error('screenshot failed'));
    const element = document.createElement('div');
    Object.defineProperty(element, 'scrollWidth', { value: 100 });
    Object.defineProperty(element, 'scrollHeight', { value: 100 });

    await expect(exportGridTablePng(element)).rejects.toThrow(
      'screenshot failed'
    );
  });
});
