/**
 * 资产配置旭日图固定分类树（来源：position_distribution_from_image.json）
 */

export interface CategoryNode {
  name: string;
  children?: CategoryNode[];
}

export const POSITION_META = {
  name: '资产配置',
  date: '2026-03-09',
} as const;

/** 未分配金额在图表中的三级类目名称（一级/二级/三级均为「现金」） */
export const CASH_CATEGORY_NAME = '现金' as const;

/** 现金叶子路径 */
export const CASH_LEAF_PATH = `${CASH_CATEGORY_NAME}/${CASH_CATEGORY_NAME}/${CASH_CATEGORY_NAME}`;

/** 三级分类树：A股 / 海外成熟 / 海外新兴 */
export const POSITION_CATEGORY_TREE: CategoryNode[] = [
  {
    name: 'A股',
    children: [
      {
        name: '价值',
        children: [{ name: '红利' }],
      },
      {
        name: '行业',
        children: [
          { name: '传媒' },
          { name: '非银金融' },
          { name: '科技' },
          { name: '消费' },
          { name: '医疗' },
          { name: '医药' },
          { name: '证券' },
        ],
      },
    ],
  },
  {
    name: '海外成熟',
    children: [
      {
        name: '美国',
        children: [{ name: '标普500' }],
      },
    ],
  },
  {
    name: '海外新兴',
    children: [
      {
        name: '海外科技',
        children: [{ name: '中概互联' }],
      },
      {
        name: '香港',
        children: [{ name: '恒生' }],
      },
    ],
  },
];

/**
 * 收集所有叶子节点路径（如 "A股/价值/红利"）
 */
export function collectLeafPaths(nodes: CategoryNode[], parentPath = ''): string[] {
  const paths: string[] = [];
  for (const node of nodes) {
    const path = parentPath ? `${parentPath}/${node.name}` : node.name;
    if (!node.children?.length) {
      paths.push(path);
    } else {
      paths.push(...collectLeafPaths(node.children, path));
    }
  }
  return paths;
}

/**
 * 收集所有节点路径，供 Collapse 默认展开
 */
export function collectAllPaths(nodes: CategoryNode[], parentPath = ''): string[] {
  const paths: string[] = [];
  for (const node of nodes) {
    const path = parentPath ? `${parentPath}/${node.name}` : node.name;
    paths.push(path);
    if (node.children?.length) {
      paths.push(...collectAllPaths(node.children, path));
    }
  }
  return paths;
}
