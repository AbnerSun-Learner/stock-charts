'use client';

import { createContext, useContext, type ReactNode } from 'react';

const FamilyAmountVisibilityContext = createContext<boolean | null>(null);

/**
 * 家庭财务金额可见性 Provider。
 * value=true 显示真实金额；false 时展示层走 ****。
 */
export function FamilyAmountVisibilityProvider({
  value,
  children,
}: {
  value: boolean;
  children: ReactNode;
}) {
  return (
    <FamilyAmountVisibilityContext.Provider value={value}>
      {children}
    </FamilyAmountVisibilityContext.Provider>
  );
}

/**
 * 读取金额是否可见。
 * 无 Provider 时默认 true（未接入显隐的页面保持明文）。
 */
export function useFamilyAmountVisibility(): boolean {
  const ctx = useContext(FamilyAmountVisibilityContext);
  return ctx ?? true;
}
