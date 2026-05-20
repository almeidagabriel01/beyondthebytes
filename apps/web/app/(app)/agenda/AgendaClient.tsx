'use client';

import { useState } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AgendaDay } from '@/components/agenda/agenda-day';
import { NewAppointmentModal } from '@/components/appointments/new-appointment-modal';
import { CancelAppointmentModal } from '@/components/appointments/cancel-appointment-modal';
import type { AppointmentResponse } from '@medschedule/shared';

export function AgendaClient() {
  const today = new Date();
  const [date, setDate] = useState<Date>(today);
  const [showNewModal, setShowNewModal] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<AppointmentResponse | null>(null);

  const isoDate = format(date, 'yyyy-MM-dd');

  const dateLabel = format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
  const dateLabelCapitalized = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Day navigation header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDate((d) => subDays(d, 1))}
              className="rounded-lg p-1.5 text-[#475569] hover:bg-[#f1f5f9] border border-[#cbd5e1] transition-colors"
              aria-label="Dia anterior"
            >
              <span className="material-symbols-outlined text-xl leading-none">chevron_left</span>
            </button>

            <h2 className="text-base font-semibold text-[#1b1b23] min-w-[240px] text-center">
              {dateLabelCapitalized}
            </h2>

            <button
              type="button"
              onClick={() => setDate((d) => addDays(d, 1))}
              className="rounded-lg p-1.5 text-[#475569] hover:bg-[#f1f5f9] border border-[#cbd5e1] transition-colors"
              aria-label="Próximo dia"
            >
              <span className="material-symbols-outlined text-xl leading-none">chevron_right</span>
            </button>

            <button
              type="button"
              onClick={() => setDate(today)}
              className="rounded-lg border border-[#cbd5e1] px-3 py-1.5 text-sm font-medium text-[#475569] hover:bg-[#f1f5f9] transition-colors"
            >
              Hoje
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#4648d4] px-4 py-2 text-sm font-medium text-white hover:bg-[#3537b3] transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-base leading-none" aria-hidden="true">
              add
            </span>
            Novo agendamento
          </button>
        </div>

        {/* 3-column bento layout */}
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
