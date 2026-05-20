import { cookies } from 'next/headers';
import { fetchMonthSummary } from '@/lib/appointments';
import { CalendarioClient } from './CalendarioClient';
import type { MonthSummaryItem } from '@medschedule/shared';

export default async function CalendarioPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const cookieStore = await cookies();

  let initialSummary: MonthSummaryItem[] = [];
  try {
    initialSummary = await fetchMonthSummary(year, month, {
      headers: { Cookie: cookieStore.toString() },
      cache: 'no-store',
    });
  } catch {
    // Fall back to empty — client will refetch
  }

  return (
    <div className="flex flex-col gap-6 p-6 h-full">
      <div>
        <h1 className="text-2xl font-bold text-[#1b1b23]">Calendário</h1>
        <p className="text-sm text-[#475569] mt-0.5">Visualize e gerencie os agendamentos do mês</p>
      </div>

      <div className="flex flex-col flex-1 rounded-xl border border-[#cbd5e1] overflow-hidden shadow-sm">
        <CalendarioClient initialSummary={initialSummary} />
      </div>
    </div>
  );
}
