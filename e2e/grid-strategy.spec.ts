import { expect, test } from '@playwright/test';

test.describe('网格策略', () => {
  test('默认参数可生成策略结果', async ({ page }) => {
    await page.goto('/view/grid');

    await page.getByRole('button', { name: '生成策略' }).click();

    await expect(page.getByText('网格计算结果')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/共 \d+ 个网格档位/)).toBeVisible();
  });

  test('最低价不低于基准价时禁用生成并展示错误', async ({ page }) => {
    await page.goto('/view/grid');

    await page.locator('#minPrice').fill('1.5');
    await page.locator('#basePrice').fill('1');

    const errorAlert = page.getByRole('alert').filter({ hasText: '参数校验未通过' });
    await expect(errorAlert).toContainText('最低价必须小于基准价');
    await expect(page.getByRole('button', { name: '生成策略' })).toBeDisabled();
  });
});
