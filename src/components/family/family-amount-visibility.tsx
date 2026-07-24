'use client';

import { createContext, useContext, type ReactNode } from 'react';

const FamilyAmountVisibilityContext = createContext<boolean | null>(null);

/**
 * 总览页金额可见性 Provider。
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
 * 无 Provider 时默认 true（ledger 等子路由不强制隐藏）。
 */
export function useFamilyAmountVisibility(): boolean {
  const ctx = useContext(FamilyAmountVisibilityContext);
  return ctx ?? true;
}
