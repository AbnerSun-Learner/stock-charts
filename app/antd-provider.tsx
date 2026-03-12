'use client';

import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useTheme } from './theme-context';

/**
 * 将全局主题上下文映射到 Ant Design ConfigProvider。
 */
function AntdConfig({ children }: { children: React.ReactNode }) {
  const { theme: appTheme, mounted } = useTheme();

  // Default to light theme during SSR and initial render
  const isDark = mounted && appTheme === 'dark';

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: isDark ? '#58a6ff' : '#2563eb',
          colorBgContainer: isDark ? '#161b22' : '#ffffff',
          colorBgElevated: isDark ? '#1c2128' : '#ffffff',
          colorBorder: isDark ? 'rgba(139, 148, 158, 0.15)' : 'rgba(15, 23, 42, 0.08)',
          colorText: isDark ? '#e6edf3' : '#0f172a',
          colorTextSecondary: isDark ? 'rgba(139, 148, 158, 0.9)' : 'rgba(15, 23, 42, 0.72)',
          colorTextTertiary: isDark ? 'rgba(139, 148, 158, 0.65)' : 'rgba(15, 23, 42, 0.52)',
          borderRadius: 8,
          fontFamily: "'DM Sans', system-ui, sans-serif",
        },
        components: {
          Card: {
            colorBgContainer: isDark ? '#1c2128' : '#ffffff',
            colorBorderSecondary: isDark ? 'rgba(139, 148, 158, 0.15)' : 'rgba(15, 23, 42, 0.08)',
          },
          Button: {
            colorBgContainer: isDark ? '#21262d' : '#ffffff',
            colorBorder: isDark ? 'rgba(139, 148, 158, 0.15)' : 'rgba(15, 23, 42, 0.08)',
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}

/**
 * 应用级 Ant Design Provider，包裹整个 React 树。
 */
export function AntdProvider({ children }: { children: React.ReactNode }) {
  return <AntdConfig>{children}</AntdConfig>;
}
