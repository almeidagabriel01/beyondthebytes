'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MonthGrid } from '@/components/calendar/month-grid';
import { DayPanel } from '@/components/calendar/day-panel';
import { NewAppointmentModal } from '@/components/appointments/new-appointment-modal';
import { CancelAppointmentModal } from '@/components/appointments/cancel-appointment-modal';
import { fetchMonthSummary } from '@/lib/appointments';
import type { MonthSummaryItem, AppointmentResponse } from '@medschedule/shared';

interface CalendarioClientProps {
  initialSummary: MonthSummaryItem[];
}

export function CalendarioClient({ initialSummary }: CalendarioClientProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState<Date>(today);
  const [selectedDay, setSelectedDay] = useState<Date>(today);
  const [showNewModal, setShowNewModal] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<AppointmentResponse | null>(null);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth() + 1;

  const { data: summary = [] } = useQuery<MonthSummaryItem[]>({
    queryKey: ['month-summary', year, month],
    queryFn: () => fetchMonthSummary(year, month),
    staleTime: 5 * 60 * 1000,
    initialData: initialSummary,
  });

  const monthLabel = format(currentMonth, 'MMMM yyyy', { locale: ptBR });
  const monthLabelCapitalized = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Navigation header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#cbd5e1] bg-white shrink-0">
          {/* Left: arrows + month label */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
              className="rounded-lg p-1.5 text-[#475569] hover:bg-[#f1f5f9] transition-colors"
              aria-label="Mês anterior"
            >
              <span className="material-symbols-outlined text-xl leading-none">chevron_left</span>
            </button>

            <h2 className="text-lg font-semibold text-[#1b1b23] min-w-[180px] text-center">
              {monthLabelCapitalized}
            </h2>

            <button
              type="button"
              onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
              className="rounded-lg p-1.5 text-[#475569] hover:bg-[#f1f5f9] transition-colors"
              aria-label="Próximo mês"
            >
              <span className="material-symbols-outlined text-xl leading-none">chevron_right</span>
            </button>
          </div>

          {/* Right: today button + view toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setCurrentMonth(today);
                setSelectedDay(today);
              }}
              className="rounded-lg border border-[#cbd5e1] px-3 py-1.5 text-sm font-medium text-[#475569] hover:bg-[#f1f5f9] transition-colors"
            >
              Hoje
            </button>

            <div className="flex bg-[#f1f5f9] rounded-lg border border-[#cbd5e1] p-1">
              <span className="px-4 py-1.5 text-[12px] font-medium bg-white border border-[#cbd5e1] shadow-sm rounded-md text-[#1b1b23]">
                Mês
              </span>
              <span className="px-4 py-1.5 text-[12px] font-medium text-[#94a3b8] cursor-not-allowed select-none">
                Semana
              </span>
              <span className="px-4 py-1.5 text-[12px] font-medium text-[#94a3b8] cursor-not-allowed select-none">
                Dia
              </span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Calendar grid */}
          <div className="flex-1 overflow-y-auto">
            <MonthGrid
              month={currentMonth}
              selectedDay={selectedDay}
              summary={summary}
              onDaySelect={setSelectedDay}
            />
          </div>

          {/* Day panel — two cards, flex column */}
          <div className="w-full xl:w-[400px] flex flex-col gap-6 overflow-y-auto shrink-0 p-4">
            <DayPanel
              selectedDay={selectedDay}
              onCancelAppointment={(appt) => setCancelTarget(appt)}
            />
          </div>
        </div>
      </div>

      {showNewModal && (
        <NewAppointmentModal
          defaultDate={format(selectedDay, 'yyyy-MM-dd')}
          onClose={() => setShowNewModal(false)}
        />
      )}

      {cancelTarget && (
        <CancelAppointmentModal appointment={cancelTarget} onClose={() => setCancelTarget(null)} />
      )}
    </>
  );
}
