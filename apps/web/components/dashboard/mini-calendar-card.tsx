'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { addMonths, format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MonthGrid } from '@/components/calendar/month-grid';
import { fetchMonthSummary } from '@/lib/appointments';

export function MiniCalendarCard() {
  const router = useRouter();
  const [month, setMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => new Date());

  const summaryQuery = useQuery({
    queryKey: ['month-summary', month.getFullYear(), month.getMonth() + 1],
    queryFn: ({ signal }) =>
      fetchMonthSummary(month.getFullYear(), month.getMonth() + 1, { signal }),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  return (
    <section className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm">
      <header className="px-5 py-4 border-b border-[#e2e8f0] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#4648d4] text-[20px]" aria-hidden="true">
            calendar_month
          </span>
          <h2 className="text-[16px] font-semibold text-[#0f172a] capitalize">
            {format(month, "MMMM 'de' yyyy", { locale: ptBR })}
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Mês anterior"
            onClick={() => setMonth((m) => subMonths(m, 1))}
            className="p-1.5 rounded-md text-[#64748b] hover:bg-[#f1f5f9]"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
          <button
            type="button"
            aria-label="Próximo mês"
            onClick={() => setMonth((m) => addMonths(m, 1))}
            className="p-1.5 rounded-md text-[#64748b] hover:bg-[#f1f5f9]"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>
      </header>
      <div className="p-3">
        <MonthGrid
          month={month}
          selectedDay={selectedDay}
          summary={summaryQuery.data ?? []}
          onDaySelect={(d) => {
            setSelectedDay(d);
            const ymd = format(d, 'yyyy-MM-dd');
            router.push(`/calendario?date=${ymd}`);
          }}
        />
      </div>
    </section>
  );
}
