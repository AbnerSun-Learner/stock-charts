/**
 * 认证开关：仅本地审阅可临时关闭登录门槛。
 * 生产构建强制启用鉴权，避免误开 AUTH_DISABLED。
 */
const AUTH_DISABLED_REQUESTED = false;

export const AUTH_DISABLED =
  AUTH_DISABLED_REQUESTED && process.env.NODE_ENV !== 'production';

/** 审阅期写入账本用的占位用户（仅 AUTH_DISABLED=true 时生效） */
export const AUTH_REVIEW_USER_ID = '00000000-0000-4000-8000-000000000001';
