'use client';

import { Select } from 'antd';
import type { IndexWithEtf } from '@/types/index-dashboard';

interface IndexSelectorProps {
  options: IndexWithEtf[];
  value: string | null;
  onChange: (indexCode: string) => void;
  loading?: boolean;
}

/**
 * 指数选择器：展示名称，副信息为代码与分类。
 */
export function IndexSelector({ options, value, onChange, loading }: IndexSelectorProps) {
  return (
    <Select
      showSearch
      optionFilterProp="label"
      loading={loading}
      value={value ?? undefined}
      onChange={onChange}
      placeholder="选择指数"
      className="w-full max-w-md"
      options={options.map(item => ({
        value: item.indexCode,
        label: `${item.indexName}（${item.indexCode}）`,
        title: `${item.category} · ETF ${item.etfCode}`,
      }))}
      size="large"
      aria-label="选择指数"
    />
  );
}
