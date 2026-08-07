import { runGridCalculation } from '@/lib/grid-run-calculation';
import {
  assertSuccessfulGridSnapshot,
  isSameGridStrategyConfig,
  normalizeGridStrategyName,
  parseSavedGridStrategy,
} from '@/lib/grid/grid-strategy-storage';
import { validateGridParams } from '@/lib/grid-validate-params';
import { DEFAULT_GRID_PARAMS } from '@/types/grid';
import type { GridStrategyConfigV1 } from '@/types/grid-strategy-storage';

function buildSuccessfulResult() {
  const validation = validateGridParams(DEFAULT_GRID_PARAMS);
  return runGridCalculation(
    DEFAULT_GRID_PARAMS,
    { dynamicGridEnabled: false, dynamicGridMode: 'stable' },
    validation
  );
}

describe('grid-strategy-storage', () => {
  it('v1 合法配置和结果快照可恢复', () => {
    const result = buildSuccessfulResult();
    const row = {
      id: 'strategy-1',
      name: '沪深300低吸',
      schema_version: 1,
      config: {
        params: DEFAULT_GRID_PARAMS,
        dynamicGridEnabled: false,
        dynamicGridMode: 'stable',
      },
      result_snapshot: result,
      created_at: '2026-08-07T01:00:00.000Z',
      updated_at: '2026-08-07T02:00:00.000Z',
    };

    expect(parseSavedGridStrategy(row)).toMatchObject({
      id: 'strategy-1',
      name: '沪深300低吸',
      schemaVersion: 1,
      resultSnapshot: result,
    });
  });

  it('未知版本抛出暂不支持', () => {
    expect(() =>
      parseSavedGridStrategy({
        id: 'x',
        name: 'a',
        schema_version: 2,
        config: {},
        result_snapshot: {},
        created_at: '2026-08-07T01:00:00.000Z',
        updated_at: '2026-08-07T02:00:00.000Z',
      })
    ).toThrow('该策略版本暂不支持');
  });

  it('非法枚举与非有限数值被拒绝', () => {
    const result = buildSuccessfulResult();
    expect(() =>
      parseSavedGridStrategy({
        id: 'x',
        name: '合法名',
        schema_version: 1,
        config: {
          params: { ...DEFAULT_GRID_PARAMS, basePrice: NaN },
          dynamicGridEnabled: false,
          dynamicGridMode: 'stable',
        },
        result_snapshot: result,
        created_at: '2026-08-07T01:00:00.000Z',
        updated_at: '2026-08-07T02:00:00.000Z',
      })
    ).toThrow('策略数据已损坏，无法打开');

    expect(() =>
      parseSavedGridStrategy({
        id: 'x',
        name: '合法名',
        schema_version: 1,
        config: {
          params: { ...DEFAULT_GRID_PARAMS },
          dynamicGridEnabled: false,
          dynamicGridMode: 'wild',
        },
        result_snapshot: result,
        created_at: '2026-08-07T01:00:00.000Z',
        updated_at: '2026-08-07T02:00:00.000Z',
      })
    ).toThrow('策略数据已损坏，无法打开');
  });

  it('失败结果快照被拒绝', () => {
    expect(() =>
      parseSavedGridStrategy({
        id: 'x',
        name: '合法名',
        schema_version: 1,
        config: {
          params: DEFAULT_GRID_PARAMS,
          dynamicGridEnabled: false,
          dynamicGridMode: 'stable',
        },
        result_snapshot: {
          gridData: [],
          stressTest: null,
          legs: [],
          aggregatedRows: [],
          amountPerGrid: 0,
          warnings: [],
          state: null,
          calculationErrors: ['E13'],
        },
        created_at: '2026-08-07T01:00:00.000Z',
        updated_at: '2026-08-07T02:00:00.000Z',
      })
    ).toThrow('策略数据已损坏，无法打开');
  });

  it('配置比较能区分参数与动态网格选项', () => {
    const base: GridStrategyConfigV1 = {
      params: DEFAULT_GRID_PARAMS,
      dynamicGridEnabled: false,
      dynamicGridMode: 'stable',
    };
    expect(isSameGridStrategyConfig(base, { ...base })).toBe(true);
    expect(
      isSameGridStrategyConfig(base, {
        ...base,
        params: { ...DEFAULT_GRID_PARAMS, basePrice: 2 },
      })
    ).toBe(false);
    expect(
      isSameGridStrategyConfig(base, {
        ...base,
        dynamicGridEnabled: true,
      })
    ).toBe(false);
    expect(
      isSameGridStrategyConfig(base, {
        ...base,
        dynamicGridMode: 'aggressive',
      })
    ).toBe(false);
  });

  it('名称规范化与长度校验', () => {
    expect(normalizeGridStrategyName('  策略A  ')).toBe('策略A');
    expect(() => normalizeGridStrategyName('   ')).toThrow('策略名称需为 1～50 个字符');
    expect(() => normalizeGridStrategyName('x'.repeat(51))).toThrow(
      '策略名称需为 1～50 个字符'
    );
  });

  it('成功快照断言可复用解析器', () => {
    const result = buildSuccessfulResult();
    expect(assertSuccessfulGridSnapshot(result)).toEqual(result);
  });
});
