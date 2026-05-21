'use client';

import type { ReactNode } from 'react';
import { TopBarSlotProvider } from '@/context/topbar-slot';
import Sidebar from './sidebar';
import TopBar from './topbar';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <TopBarSlotProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="ml-64 flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </TopBarSlotProvider>
  );
}
