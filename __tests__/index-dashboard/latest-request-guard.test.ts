import { LatestRequestGuard } from '@/lib/index-dashboard/latest-request-guard';

describe('LatestRequestGuard', () => {
  it('只认可最后开始的请求', () => {
    const guard = new LatestRequestGuard();
    const first = guard.begin();
    const second = guard.begin();

    expect(guard.isLatest(first)).toBe(false);
    expect(guard.isLatest(second)).toBe(true);
  });

  it('失效后拒绝此前请求', () => {
    const guard = new LatestRequestGuard();
    const requestId = guard.begin();

    guard.invalidate();

    expect(guard.isLatest(requestId)).toBe(false);
  });
});
