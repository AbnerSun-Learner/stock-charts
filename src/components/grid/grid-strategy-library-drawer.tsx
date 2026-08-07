'use client';

import { Button, Drawer, Dropdown, Empty, Spin, Typography } from 'antd';
import {
  MoreOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import type { GridStrategyMetadata } from '@/types/grid-strategy-storage';

export interface GridStrategyLibraryDrawerProps {
  open: boolean;
  strategies: GridStrategyMetadata[];
  currentStrategyId: string | null;
  loading: boolean;
  error: string | null;
  actionId: string | null;
  isMobile: boolean;
  onClose: () => void;
  onRetry: () => void;
  onOpenStrategy: (id: string) => void;
  onRenameStrategy: (strategy: GridStrategyMetadata) => void;
  onDeleteStrategy: (strategy: GridStrategyMetadata) => void;
}

function formatUpdatedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * “我的策略”列表抽屉：打开、改名、删除由父层处理。
 */
export function GridStrategyLibraryDrawer({
  open,
  strategies,
  currentStrategyId,
  loading,
  error,
  actionId,
  isMobile,
  onClose,
  onRetry,
  onOpenStrategy,
  onRenameStrategy,
  onDeleteStrategy,
}: GridStrategyLibraryDrawerProps) {
  return (
    <Drawer
      title="我的策略"
      open={open}
      onClose={onClose}
      placement={isMobile ? 'bottom' : 'right'}
      width={isMobile ? undefined : 420}
      height={isMobile ? '90%' : undefined}
      destroyOnClose={false}
      rootClassName="grid-strategy-library-drawer"
    >
      {loading ? (
        <div className="grid-strategy-library__center">
          <Spin tip="加载中…" />
        </div>
      ) : error ? (
        <div className="grid-strategy-library__center">
          <Typography.Paragraph type="danger">{error}</Typography.Paragraph>
          <Button icon={<ReloadOutlined />} onClick={onRetry}>
            重试
          </Button>
        </div>
      ) : strategies.length === 0 ? (
        <Empty description="还没有保存的策略" />
      ) : (
        <ul className="grid-strategy-library__list">
          {strategies.map(strategy => {
            const busy = actionId === strategy.id;
            const isCurrent = currentStrategyId === strategy.id;
            const menuItems: MenuProps['items'] = [
              {
                key: 'rename',
                label: '改名',
                disabled: busy,
                onClick: () => onRenameStrategy(strategy),
              },
              {
                key: 'delete',
                label: '删除',
                danger: true,
                disabled: busy,
                onClick: () => onDeleteStrategy(strategy),
              },
            ];

            return (
              <li
                key={strategy.id}
                className={`grid-strategy-library__item${
                  isCurrent ? ' grid-strategy-library__item--current' : ''
                }`}
              >
                <div className="grid-strategy-library__main">
                  <div className="grid-strategy-library__title-row">
                    <span className="grid-strategy-library__name">
                      {strategy.name}
                    </span>
                    {isCurrent ? (
                      <span className="grid-strategy-library__badge">当前</span>
                    ) : null}
                  </div>
                  <span className="grid-strategy-library__time">
                    更新于 {formatUpdatedAt(strategy.updatedAt)}
                  </span>
                </div>
                <div className="grid-strategy-library__actions">
                  <Button
                    type="primary"
                    shape="round"
                    size="small"
                    loading={busy}
                    disabled={Boolean(actionId) && !busy}
                    onClick={() => onOpenStrategy(strategy.id)}
                  >
                    打开
                  </Button>
                  <Dropdown menu={{ items: menuItems }} trigger={['click']}>
                    <Button
                      type="text"
                      icon={<MoreOutlined />}
                      aria-label={`更多操作：${strategy.name}`}
                      disabled={Boolean(actionId)}
                    />
                  </Dropdown>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Drawer>
  );
}
