/**
 * 为并发异步加载分配递增编号，仅允许最后一次请求提交结果。
 */
export class LatestRequestGuard {
  private latestId = 0;

  begin(): number {
    this.latestId += 1;
    return this.latestId;
  }

  isLatest(requestId: number): boolean {
    return requestId === this.latestId;
  }

  invalidate(): void {
    this.latestId += 1;
  }
}
