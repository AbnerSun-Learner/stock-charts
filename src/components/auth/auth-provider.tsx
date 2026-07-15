'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { tryGetSupabasePublicConfig } from '@/lib/supabase/env';
import {
  formatAuthUserLabel,
  getCurrentUser,
  signInWithGitHub,
  signOut,
} from '@/lib/supabase/auth';
import { AUTH_DISABLED } from '@/lib/supabase/auth-flags';
import type { AuthUiStatus } from '@/lib/supabase/auth-ui';

type AuthFeedback = {
  type: 'success' | 'error';
  text: string;
} | null;

type AuthContextValue = {
  status: AuthUiStatus;
  user: User | null;
  userLabel: string;
  configError: string | null;
  feedback: AuthFeedback;
  signingIn: boolean;
  refreshUser: () => Promise<void>;
  startGitHubSignIn: (nextPath?: string) => Promise<void>;
  signOutCurrentUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function buildRedirectTo(nextPath: string) {
  if (typeof window === 'undefined') {
    return '';
  }
  const safeNext = nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/';
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthUiStatus>(
    AUTH_DISABLED ? 'authenticated' : 'loading'
  );
  const [user, setUser] = useState<User | null>(null);
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [feedback, setFeedback] = useState<AuthFeedback>(null);

  const refreshActiveUser = useCallback(async (activeClient: SupabaseClient) => {
    const timeoutMs = 8_000;
    const result = await Promise.race([
      getCurrentUser(activeClient),
      new Promise<Awaited<ReturnType<typeof getCurrentUser>>>(resolve => {
        setTimeout(
          () =>
            resolve({
              ok: false,
              error: '会话检查超时，请重试登录',
              code: 'timeout',
            }),
          timeoutMs
        );
      }),
    ]);

    if (!result.ok) {
      setUser(null);
      setStatus('guest');
      return;
    }
    if (result.value) {
      setUser(result.value);
      setStatus('authenticated');
      return;
    }
    setUser(null);
    setStatus('guest');
  }, []);

  useEffect(() => {
    if (AUTH_DISABLED) {
      setStatus('authenticated');
      return;
    }

    if (!tryGetSupabasePublicConfig()) {
      setConfigError(
        '缺少 NEXT_PUBLIC_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_ANON_KEY，请参考 .env.local.example'
      );
      setStatus('misconfigured');
      return;
    }

    let unsubscribe: (() => void) | undefined;
    try {
      const activeClient = createSupabaseBrowserClient();
      setClient(activeClient);
      setStatus('guest');
      void refreshActiveUser(activeClient);
      const { data } = activeClient.auth.onAuthStateChange(() => {
        void refreshActiveUser(activeClient);
      });
      unsubscribe = () => data.subscription.unsubscribe();
    } catch (error) {
      setConfigError(
        error instanceof Error ? error.message : 'Supabase 客户端初始化失败'
      );
      setStatus('misconfigured');
    }

    return () => {
      unsubscribe?.();
    };
  }, [refreshActiveUser]);

  const refreshUser = useCallback(async () => {
    if (!client) {
      return;
    }
    await refreshActiveUser(client);
  }, [client, refreshActiveUser]);

  const startGitHubSignIn = useCallback(
    async (nextPath?: string) => {
      if (!client) {
        return;
      }
      const currentPath =
        typeof window !== 'undefined' ? window.location.pathname : '/';
      setSigningIn(true);
      setFeedback(null);
      const result = await signInWithGitHub(
        client,
        buildRedirectTo(nextPath ?? currentPath)
      );
      if (!result.ok) {
        setSigningIn(false);
        setFeedback({ type: 'error', text: result.error });
        return;
      }
      window.location.assign(result.value.url);
    },
    [client]
  );

  const signOutCurrentUser = useCallback(async () => {
    if (!client) {
      return;
    }
    const result = await signOut(client);
    if (!result.ok) {
      setFeedback({ type: 'error', text: result.error });
      return;
    }
    setFeedback(null);
    await refreshActiveUser(client);
  }, [client, refreshActiveUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      userLabel: user ? formatAuthUserLabel(user) : '本地用户',
      configError,
      feedback,
      signingIn,
      refreshUser,
      startGitHubSignIn,
      signOutCurrentUser,
    }),
    [
      status,
      user,
      configError,
      feedback,
      signingIn,
      refreshUser,
      startGitHubSignIn,
      signOutCurrentUser,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
