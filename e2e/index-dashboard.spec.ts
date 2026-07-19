import { expect, test } from '@playwright/test';

test.describe('指数分析', () => {
  test('首页入口可进入并展示完整分析模块', async ({ page }) => {
    test.setTimeout(90_000);

    await page.goto('/');
    const card = page.locator('.home-tool-card').filter({ hasText: '指数分析' });
    await card.getByRole('button', { name: '立即使用' }).click();
    await expect(page).toHaveURL(/\/view\/index-dashboard/);

    await expect(page.getByRole('heading', { name: '指数分析' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '指数走势' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '市盈率 PE_TTM' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '市净率 PB' })).toBeVisible();

    await expect(page.getByRole('heading', { name: '行业权重' })).toBeVisible();
    const industryObservation = page.locator('aside').filter({ hasText: '结构观察' });
    await expect(industryObservation).toBeVisible();
    await expect(industryObservation.getByText('当前结构最集中的三大行业')).toBeVisible();
    await expect(industryObservation.getByText('前三行业合计')).toBeVisible();
    await expect(
      industryObservation.locator('strong').filter({ hasText: /\d+\.\d+%/ }).last()
    ).toBeVisible();
    await expect(page.getByText('完整行业明细')).toHaveCount(0);
    await expect(page.getByRole('table')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: '极限跌幅' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '跟踪 ETF 行情' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /前往网格策略/ })).toBeVisible();
  });

  test('无历史指标时各模块保留并展示空态', async ({ page }) => {
    test.setTimeout(60_000);

    await page.route('**/rest/v1/index_daily_metrics*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Content-Range': '0-0/0' },
        body: '[]',
      });
    });
    const metricsResponse = page.waitForResponse(
      response => response.url().includes('/rest/v1/index_daily_metrics')
    );
    await page.goto('/view/index-dashboard?code=000300.SH');
    await metricsResponse;

    await expect(page.getByText('该指数暂无历史走势数据')).toBeVisible({ timeout: 25_000 });
    await expect(page.getByText('该指数暂无市盈率 PE_TTM历史数据')).toBeVisible();
    await expect(page.getByText('该指数暂无市净率 PB历史数据')).toBeVisible();
    await expect(page.getByText('该指数暂无可计算的收盘数据')).toBeVisible();
  });
});
