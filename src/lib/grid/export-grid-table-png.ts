import { domToPng } from 'modern-screenshot';

export const GRID_TABLE_EXPORT_PREFIX = '网格策略-';
export const GRID_TABLE_EXPORT_EXT = '.png';
const MAX_CAPTURE_WIDTH = 4096;
const PNG_DATA_URL_PREFIX = 'data:image/png;base64,iVBORw0KGgo';

/** 格式化导出文件名日期部分 */
export function formatExportDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/** 触发浏览器下载 PNG */
export function downloadDataUrlPng(dataUrl: string, filename: string): void {
  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = filename;
  anchor.click();
}

/**
 * 将 DOM 节点渲染为 PNG Data URL（白底，2x 清晰度）。
 */
export async function captureElementAsPngDataUrl(
  element: HTMLElement
): Promise<string> {
  const scrollContainer = element.querySelector<HTMLElement>(
    '[aria-label="网格结果表，可横向滚动"]'
  );
  const captureTarget = scrollContainer ?? element;
  const parent = captureTarget.parentElement;
  const prevOverflow = captureTarget.style.overflow;
  const prevParentOverflow = parent?.style.overflow ?? '';
  const prevWidth = captureTarget.style.width;
  const captureWidth = Math.min(
    Math.max(captureTarget.scrollWidth, 1),
    MAX_CAPTURE_WIDTH
  );
  const captureHeight = Math.max(captureTarget.scrollHeight, 1);

  captureTarget.style.overflow = 'visible';
  captureTarget.style.width = `${captureWidth}px`;
  if (parent) {
    parent.style.overflow = 'visible';
  }

  try {
    const dataUrl = await domToPng(captureTarget, {
      backgroundColor: '#ffffff',
      scale: 2,
      width: captureWidth,
      height: captureHeight,
    });
    if (!dataUrl.startsWith(PNG_DATA_URL_PREFIX)) {
      throw new Error('截图结果不是有效的 PNG');
    }
    return dataUrl;
  } finally {
    captureTarget.style.overflow = prevOverflow;
    captureTarget.style.width = prevWidth;
    if (parent) {
      parent.style.overflow = prevParentOverflow;
    }
  }
}

/**
 * 捕获 DOM 并下载为 PNG，返回文件名。
 */
export async function exportGridTablePng(
  element: HTMLElement,
  exportDate: Date = new Date()
): Promise<string> {
  const dataUrl = await captureElementAsPngDataUrl(element);
  const filename = `${GRID_TABLE_EXPORT_PREFIX}${formatExportDate(exportDate)}${GRID_TABLE_EXPORT_EXT}`;
  downloadDataUrlPng(dataUrl, filename);
  return filename;
}
