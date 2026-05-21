'use client';

import type { ReactNode } from 'react';
import { TopBarSlotProvider } from '@/context/topbar-slot';
import Sidebar from './sidebar';
import TopBar from './topbar';
import { BottomNav } from './bottom-nav';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <TopBarSlotProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="ml-0 md:ml-16 lg:ml-64 flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto pb-16 md:pb-0">{children}</main>
        </div>
        <BottomNav />
      </div>
    </TopBarSlotProvider>
  );
}
