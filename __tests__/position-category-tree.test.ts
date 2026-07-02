import {
  CASH_LEAF_PATH,
  collectAllPaths,
  POSITION_CATEGORY_TREE,
} from '@/utils/position-category-tree';

/** 从全路径列表中筛出叶子路径（无更深层级） */
function filterLeafPaths(paths: string[]): string[] {
  return paths.filter(
    path => !paths.some(other => other !== path && other.startsWith(`${path}/`))
  );
}

describe('position-category-tree', () => {
  it('collectAllPaths 包含典型叶子路径', () => {
    const paths = collectAllPaths(POSITION_CATEGORY_TREE);
    expect(paths).toContain('A股/价值/红利');
    expect(paths).toContain('海外成熟/美国/标普500');
    expect(paths).toContain('A股');
  });

  it('collectAllPaths 可筛出叶子路径', () => {
    const allPaths = collectAllPaths(POSITION_CATEGORY_TREE);
    const leafPaths = filterLeafPaths(allPaths);
    expect(leafPaths).toContain('A股/价值/红利');
    expect(leafPaths).not.toContain('A股');
    expect(leafPaths).not.toContain('A股/价值');
  });

  it('每个一级分类至少有一个叶子节点', () => {
    for (const l1 of POSITION_CATEGORY_TREE) {
      const leaves = filterLeafPaths(collectAllPaths([l1]));
      expect(leaves.length).toBeGreaterThan(0);
    }
  });

  it('CASH_LEAF_PATH 为三级现金路径', () => {
    expect(CASH_LEAF_PATH).toBe('现金/现金/现金');
  });
});
