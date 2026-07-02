import {
  CASH_LEAF_PATH,
  collectAllPaths,
  collectLeafPaths,
  POSITION_CATEGORY_TREE,
} from '@/utils/position-category-tree';

describe('position-category-tree', () => {
  it('collectAllPaths 包含典型叶子路径', () => {
    const paths = collectAllPaths(POSITION_CATEGORY_TREE);
    expect(paths).toContain('A股/价值/红利');
    expect(paths).toContain('海外成熟/美国/标普500');
    expect(paths).toContain('A股');
  });

  it('collectLeafPaths 仅返回叶子路径', () => {
    const leafPaths = collectLeafPaths(POSITION_CATEGORY_TREE);
    expect(leafPaths).toContain('A股/价值/红利');
    expect(leafPaths).not.toContain('A股');
    expect(leafPaths).not.toContain('A股/价值');
  });

  it('每个一级分类至少有一个叶子节点', () => {
    for (const l1 of POSITION_CATEGORY_TREE) {
      const leaves = collectLeafPaths([l1]);
      expect(leaves.length).toBeGreaterThan(0);
    }
  });

  it('CASH_LEAF_PATH 为三级现金路径', () => {
    expect(CASH_LEAF_PATH).toBe('现金/现金/现金');
  });
});
