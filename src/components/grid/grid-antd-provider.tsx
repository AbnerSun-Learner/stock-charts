'use client';

import { App, ConfigProvider } from 'antd';

interface GridAntdProviderProps {
  children: React.ReactNode;
}

/**
 * 网格页专用 Ant Design 配置（与 stock-view 一致）。
 */
export function GridAntdProvider({ children }: GridAntdProviderProps) {
  return (
    <ConfigProvider
      theme={{
        token: {
          borderRadius: 12,
          colorPrimary: '#0052FF',
          zIndexPopupBase: 10000,
          colorBgSpotlight: '#ffffff',
          colorTextLightSolid: '#0f172a',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif',
        },
        components: {
          InputNumber: {
            controlHeight: 48,
            fontSize: 16,
            fontWeightStrong: 600,
          },
        },
      }}
    >
      <App>{children}</App>
    </ConfigProvider>
  );
}
