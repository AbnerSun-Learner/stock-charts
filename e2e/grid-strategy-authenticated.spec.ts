import { expect, test } from '@playwright/test';

const userAState = process.env.GRID_E2E_USER_A_STORAGE_STATE;
const userBState = process.env.GRID_E2E_USER_B_STORAGE_STATE;

/**
 * 双账号认证 E2E：依赖本机/CI 的 Playwright storageState，不提交仓库。
 * 缺少任一路径时 skip，并输出明确原因。
 */
test.describe('网格策略云端保存（认证）', () => {
  test.beforeEach(() => {
    test.skip(
      !userAState || !userBState,
      '缺少 GRID_E2E_USER_A_STORAGE_STATE / GRID_E2E_USER_B_STORAGE_STATE，跳过认证 E2E'
    );
  });

  test('A 保存后 B 不可见，且 A 可覆盖/改名/删除', async ({ browser }) => {
    const contextA = await browser.newContext({ storageState: userAState });
    const contextB = await browser.newContext({ storageState: userBState });
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    const strategyName = `E2E-${Date.now()}`;
    const renamed = `${strategyName}-renamed`;

    try {
      await pageA.goto('/view/grid');
      await pageA.getByRole('button', { name: '生成策略' }).click();
      await expect(pageA.getByRole('button', { name: '保存策略' })).toBeEnabled({
        timeout: 15_000,
      });
      await pageA.getByRole('button', { name: '保存策略' }).click();
      await pageA.getByLabel('策略名称').fill(strategyName);
      await pageA.getByRole('button', { name: '保存' }).click();
      await expect(pageA.getByRole('button', { name: '已保存' })).toBeVisible({
        timeout: 15_000,
      });

      await pageA.getByRole('button', { name: '我的策略' }).click();
      await expect(pageA.getByText(strategyName)).toBeVisible();

      await pageB.goto('/view/grid');
      await pageB.getByRole('button', { name: '我的策略' }).click();
      await expect(pageB.getByText(strategyName)).toHaveCount(0);

      await pageA.locator('#basePrice').fill('1.2');
      // 若列表仍打开，先关闭再改参；摘要条「修改参数」进入抽屉
      await pageA.keyboard.press('Escape');
      await pageA.getByRole('button', { name: '修改参数' }).click();
      await pageA.getByRole('button', { name: '重新生成' }).click();
      await expect(pageA.getByRole('button', { name: '更新策略' })).toBeEnabled({
        timeout: 15_000,
      });
      await pageA.getByRole('button', { name: '更新策略' }).click();
      await expect(pageA.getByRole('button', { name: '已保存' })).toBeVisible();

      await pageA.getByRole('button', { name: '我的策略' }).click();
      await pageA
        .getByRole('button', { name: `更多操作：${strategyName}` })
        .click();
      await pageA.getByRole('menuitem', { name: '改名' }).click();
      await pageA.getByLabel('策略名称').fill(renamed);
      await pageA.getByRole('button', { name: '确认' }).click();
      await expect(pageA.getByText(renamed)).toBeVisible();

      await pageA
        .getByRole('button', { name: `更多操作：${renamed}` })
        .click();
      await pageA.getByRole('menuitem', { name: '删除' }).click();
      await pageA.getByRole('button', { name: '删除' }).click();
      await expect(pageA.getByText(renamed)).toHaveCount(0);
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });
});
