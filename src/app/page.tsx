import { AppShell } from '@/components/app-shell/app-shell';
import { HomeWorkbench } from '@/components/home/home-workbench';

/**
 * 应用首页：ETF 投资驾驶舱工作台。
 */
export default function HomePage() {
  return (
    <AppShell>
      <HomeWorkbench />
    </AppShell>
  );
}
