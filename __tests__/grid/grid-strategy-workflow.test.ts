import {
  getGridStrategySaveState,
  hasDiscardableGridChanges,
} from '@/lib/grid/grid-strategy-workflow';

describe('grid-strategy-workflow', () => {
  it('按矩阵输出保存按钮状态', () => {
    expect(
      getGridStrategySaveState({
        hasResult: false,
        hasCloudId: false,
        draftDirty: false,
        generatedDirty: false,
      })
    ).toEqual({ label: '保存策略', disabled: true, reason: null });

    expect(
      getGridStrategySaveState({
        hasResult: true,
        hasCloudId: false,
        draftDirty: false,
        generatedDirty: true,
      })
    ).toEqual({ label: '保存策略', disabled: false, reason: null });

    expect(
      getGridStrategySaveState({
        hasResult: true,
        hasCloudId: false,
        draftDirty: true,
        generatedDirty: true,
      })
    ).toMatchObject({
      label: '保存策略',
      disabled: true,
      reason: expect.stringContaining('重新生成'),
    });

    expect(
      getGridStrategySaveState({
        hasResult: true,
        hasCloudId: true,
        draftDirty: false,
        generatedDirty: false,
      })
    ).toEqual({ label: '已保存', disabled: true, reason: null });

    expect(
      getGridStrategySaveState({
        hasResult: true,
        hasCloudId: true,
        draftDirty: false,
        generatedDirty: true,
      })
    ).toEqual({ label: '更新策略', disabled: false, reason: null });

    expect(
      getGridStrategySaveState({
        hasResult: true,
        hasCloudId: true,
        draftDirty: true,
        generatedDirty: false,
      })
    ).toMatchObject({
      label: '更新策略',
      disabled: true,
      reason: expect.stringContaining('重新生成'),
    });
  });

  it('放弃确认覆盖未保存结果与草稿', () => {
    expect(
      hasDiscardableGridChanges({
        hasResult: true,
        hasCloudId: false,
        draftDirty: false,
        generatedDirty: true,
      })
    ).toBe(true);

    expect(
      hasDiscardableGridChanges({
        hasResult: true,
        hasCloudId: true,
        draftDirty: false,
        generatedDirty: true,
      })
    ).toBe(true);

    expect(
      hasDiscardableGridChanges({
        hasResult: true,
        hasCloudId: true,
        draftDirty: true,
        generatedDirty: false,
      })
    ).toBe(true);

    expect(
      hasDiscardableGridChanges({
        hasResult: true,
        hasCloudId: true,
        draftDirty: false,
        generatedDirty: false,
      })
    ).toBe(false);
  });
});
