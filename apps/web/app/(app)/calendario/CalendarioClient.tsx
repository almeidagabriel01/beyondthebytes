'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MonthGrid } from '@/components/calendar/month-grid';
import { DayPanel } from '@/components/calendar/day-panel';
import { NewAppointmentModal } from '@/components/appointments/new-appointment-modal';
import { CancelAppointmentModal } from '@/components/appointments/cancel-appointment-modal';
import { fetchMonthSummary } from '@/lib/appointments';
import { useTopBarSlot } from '@/context/topbar-slot';
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
  const { setOnNewAppointment } = useTopBarSlot();

  useEffect(() => {
    setOnNewAppointment(() => setShowNewModal(true));
    return () => setOnNewAppointment(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      <div className="p-4 md:p-8">
        {/* Calendar controls — flat content row */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          {/* Left: big month title + nav pill */}
          <div className="flex items-center gap-4">
            <h2 className="text-[36px] font-bold leading-[44px] tracking-[-0.02em] text-[#0f172a]">
              {monthLabelCapitalized}
            </h2>
            <div className="flex bg-[#f8fafc] rounded-lg border border-[#cbd5e1] p-1">
              <button
                type="button"
                onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
                aria-label="Mês anterior"
                className="p-1 rounded hover:bg-[#e2e8f0] transition-colors text-[#475569]"
              >
                <span className="material-symbols-outlined text-xl leading-none">chevron_left</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentMonth(today);
                  setSelectedDay(today);
                }}
                className="px-3 py-1 text-[12px] font-semibold tracking-[0.05em] uppercase text-[#0f172a] hover:bg-[#e2e8f0] rounded transition-colors"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
                aria-label="Próximo mês"
                className="p-1 rounded hover:bg-[#e2e8f0] transition-colors text-[#475569]"
              >
                <span className="material-symbols-outlined text-xl leading-none">
                  chevron_right
                </span>
              </button>
            </div>
          </div>

          {/* Right: view toggle */}
          <div className="flex items-center gap-3">
            <div className="flex bg-[#f8fafc] rounded-lg border border-[#cbd5e1] p-1">
              <span className="px-4 py-1.5 text-[12px] font-semibold bg-white border border-[#cbd5e1] shadow-sm rounded-md text-[#0f172a]">
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

        {/* Two-column layout: calendar grid + day panel */}
        <div className="flex flex-col xl:flex-row gap-5">
          {/* Left — month grid */}
          <div className="flex-1">
            <div className="bg-white border border-[#cbd5e1] rounded-xl shadow-sm overflow-hidden">
              <MonthGrid
                month={currentMonth}
                selectedDay={selectedDay}
                summary={summary}
                onDaySelect={setSelectedDay}
              />
            </div>
          </div>

          {/* Right — day panel (two cards via Fragment) */}
          <div className="w-full xl:w-[400px] flex flex-col gap-6 flex-shrink-0">
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
