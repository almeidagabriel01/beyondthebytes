'use client';

import { useState, useEffect } from 'react';
import { format, addDays, subDays, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AgendaDay } from '@/components/agenda/agenda-day';
import { NewAppointmentModal } from '@/components/appointments/new-appointment-modal';
import { CancelAppointmentModal } from '@/components/appointments/cancel-appointment-modal';
import { useTopBarSlot } from '@/context/topbar-slot';
import type { AppointmentResponse } from '@medschedule/shared';

export function AgendaClient() {
  const today = new Date();
  const [date, setDate] = useState<Date>(today);
  const [showNewModal, setShowNewModal] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<AppointmentResponse | null>(null);

  const isoDate = format(date, 'yyyy-MM-dd');
  const { setRightSlot, setOnNewAppointment } = useTopBarSlot();

  function formatAgendaDate(d: Date): string {
    const day = format(d, 'd', { locale: ptBR });
    const month = format(d, 'MMM', { locale: ptBR });
    const monthCap = month.charAt(0).toUpperCase() + month.slice(1).replace('.', '');
    if (isToday(d)) return `Hoje, ${day} ${monthCap}`;
    const weekday = format(d, 'EEE', { locale: ptBR }).replace('.', '');
    const weekdayCap = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    return `${weekdayCap}, ${day} ${monthCap}`;
  }

  const dateLabel = formatAgendaDate(date);

  // Inject date navigation into TopBar right slot
  useEffect(() => {
    setRightSlot(
      <div className="flex items-center bg-[#f8fafc] rounded-lg p-1 border border-[#cbd5e1]/60">
        <button
          type="button"
          aria-label="Dia anterior"
          onClick={() => setDate((d) => subDays(d, 1))}
          className="p-2 text-[#475569] hover:bg-[#e2e8f0] rounded-md transition-colors"
        >
          <span className="material-symbols-outlined text-[20px] leading-none">chevron_left</span>
        </button>
        <button
          type="button"
          onClick={() => setDate(today)}
          className="px-4 py-2 text-[14px] font-medium text-[#0f172a] flex items-center gap-2 hover:bg-[#e2e8f0] rounded-md transition-colors"
        >
          {dateLabel}
          <span className="material-symbols-outlined text-[18px] leading-none text-[#475569]">
            calendar_today
          </span>
        </button>
        <button
          type="button"
          aria-label="Próximo dia"
          onClick={() => setDate((d) => addDays(d, 1))}
          className="p-2 text-[#475569] hover:bg-[#e2e8f0] rounded-md transition-colors"
        >
          <span className="material-symbols-outlined text-[20px] leading-none">chevron_right</span>
        </button>
      </div>,
    );
    setOnNewAppointment(() => setShowNewModal(true));

    return () => {
      setRightSlot(null);
      setOnNewAppointment(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateLabel]);

  return (
    <>
      {/* 3-column bento layout */}
      <div className="p-4 md:p-8">
        <AgendaDay isoDate={isoDate} onCancelAppointment={(appt) => setCancelTarget(appt)} />
      </div>

      {showNewModal && (
        <NewAppointmentModal defaultDate={isoDate} onClose={() => setShowNewModal(false)} />
      )}

      {cancelTarget && (
        <CancelAppointmentModal appointment={cancelTarget} onClose={() => setCancelTarget(null)} />
      )}
    </>
  );
}
