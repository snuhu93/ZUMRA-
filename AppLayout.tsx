import type { ReactNode } from 'react';
import TopHeader from '@/components/TopHeader';
import BottomNav from '@/components/BottomNav';
import OfflineBanner from '@/components/OfflineBanner';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-gray-50 dark:bg-surface-dark">
      <TopHeader />
      <OfflineBanner />
      <main className="flex-1 pb-16">{children}</main>
      <BottomNav />
    </div>
  );
}
