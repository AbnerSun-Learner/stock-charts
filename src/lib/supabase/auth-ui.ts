export type AuthUiStatus =
  | 'loading'
  | 'guest'
  | 'authenticated'
  | 'misconfigured';

export function getAuthActionLabel(status: AuthUiStatus) {
  return status === 'authenticated' ? '登出' : '登录';
}

export function canEnterProtectedRoute(status: AuthUiStatus) {
  return status === 'authenticated';
}
