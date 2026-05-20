import type { Metadata } from 'next';
import Sidebar from '@/components/layout/sidebar';
import TopBar from '@/components/layout/topbar';

export const metadata: Metadata = {
  title: {
    template: '%s | MedSchedule',
    default: 'MedSchedule',
  },
};

export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="ml-64 flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
