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
    <div className="p-6 min-h-full">
      <div className="min-h-full rounded-xl border border-[#cbd5e1] shadow-sm">
        <CalendarioClient initialSummary={initialSummary} />
      </div>
    </div>
  );
}
