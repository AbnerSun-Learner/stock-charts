'use client';

import { Avatar, Dropdown, App } from 'antd';
import type { MenuProps } from 'antd';
import type { User } from '@supabase/supabase-js';
import { signOut } from '@/lib/supabase/auth';

export interface UserMenuProps {
  user: User;
  onSignedOut?: () => void;
}

/**
 * 已登录用户菜单（头像 + 退出）。
 */
export function UserMenu({ user, onSignedOut }: UserMenuProps) {
  const { message } = App.useApp();
  const meta = user.user_metadata ?? {};
  const avatarUrl = typeof meta.avatar_url === 'string' ? meta.avatar_url : undefined;
  const name =
    (typeof meta.user_name === 'string' && meta.user_name) ||
    (typeof meta.preferred_username === 'string' && meta.preferred_username) ||
    user.email ||
    '已登录';

  const items: MenuProps['items'] = [
    {
      key: 'user',
      label: name,
      disabled: true,
    },
    { type: 'divider' },
    {
      key: 'logout',
      label: '退出登录',
      onClick: async () => {
        await signOut();
        message.success('已退出');
        onSignedOut?.();
      },
    },
  ];

  return (
    <Dropdown menu={{ items }} placement="bottomRight">
      <button
        type="button"
        className="inline-flex items-center gap-2 border-0 bg-transparent cursor-pointer p-0"
        aria-label="用户菜单"
      >
        <Avatar size="small" src={avatarUrl}>
          {name.slice(0, 1).toUpperCase()}
        </Avatar>
        <span className="text-sm text-[var(--text-secondary)] hidden sm:inline">{name}</span>
      </button>
    </Dropdown>
  );
}
