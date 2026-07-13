import { sendMagicLink, exchangeMagicLinkCode } from '@/lib/supabase/auth';
import type { SupabaseClient } from '@supabase/supabase-js';

function mockClient(auth: Record<string, jest.Mock>): SupabaseClient {
  return { auth } as unknown as SupabaseClient;
}

describe('supabase auth helpers', () => {
  it('邮箱非法时拒绝发送', async () => {
    const client = mockClient({ signInWithOtp: jest.fn() });
    const result = await sendMagicLink(client, 'bad', 'http://localhost/auth/callback');
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.code).toBe('invalid_email');
  });

  it('发送 Magic Link 成功', async () => {
    const signInWithOtp = jest.fn().mockResolvedValue({ error: null });
    const client = mockClient({ signInWithOtp });
    const result = await sendMagicLink(
      client,
      'a@b.com',
      'http://localhost/auth/callback'
    );
    expect(result.ok).toBe(true);
    expect(signInWithOtp).toHaveBeenCalled();
  });

  it('过期链接映射为可恢复错误', async () => {
    const exchangeCodeForSession = jest.fn().mockResolvedValue({
      data: { session: null },
      error: { message: 'otp_expired', code: 'otp_expired' },
    });
    const client = mockClient({ exchangeCodeForSession });
    const result = await exchangeMagicLinkCode(client, 'bad-code');
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.code).toBe('otp_expired');
  });
});
