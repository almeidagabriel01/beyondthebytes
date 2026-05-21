'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type {
  AppointmentResponse,
  AppointmentEventResponse,
  AppointmentStatus,
} from '@medschedule/shared';
import { isTerminal } from '@medschedule/shared';
import { StatusBadge } from '@/components/shared/status-badge';
import { StatusTimeline } from '@/components/appointments/status-timeline';
import { StatusActions } from '@/components/appointments/status-actions';
import { CancelAppointmentModal } from '@/components/appointments/cancel-appointment-modal';
import { EditAppointmentModal } from '@/components/appointments/edit-appointment-modal';
import { transitionAppointment } from '@/lib/appointments';

const TYPE_LABELS: Record<AppointmentResponse['type'], string> = {
  CONSULTA: 'Consulta',
  RETORNO: 'Retorno',
  AVALIACAO: 'Avaliação',
  PROCEDIMENTO: 'Procedimento',
};

function patientInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function formatDateTime(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const date = format(start, "d 'de' MMM yyyy", { locale: ptBR });
  const timeRange = `${format(start, 'HH:mm')} – ${format(end, 'HH:mm')}`;
  return `${date}, ${timeRange}`;
}

interface AppointmentDetailClientProps {
  appointment: AppointmentResponse;
  events: AppointmentEventResponse[];
}

export function AppointmentDetailClient({
  appointment: appt,
  events,
}: AppointmentDetailClientProps) {
  const router = useRouter();
  const [transitioning, setTransitioning] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const handleTransition = useCallback(
    async (to: AppointmentStatus) => {
      if (to === 'CANCELADO') {
        setShowCancel(true);
        return;
      }
      setTransitioning(true);
      try {
        await transitionAppointment(appt.id, to);
        router.refresh();
      } finally {
        setTransitioning(false);
      }
    },
    [appt.id, router],
  );

  const terminal = isTerminal(appt.status);

  return (
    <>
      <div className="flex flex-col min-h-screen bg-[#f8fafc]">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-white border-b border-[#e2e8f0] px-4 md:px-8 py-4 flex items-center justify-between shadow-[0_1px_4px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="p-2 -ml-2 text-[#64748b] hover:bg-[#f1f5f9] rounded-full transition-colors"
              aria-label="Voltar"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 className="text-[18px] font-semibold text-[#0f172a]">Detalhe do Agendamento</h1>
          </div>
          <StatusBadge status={appt.status} className="text-[12px] px-3 py-1.5" />
        </header>

        {/* Content */}
        <main className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full space-y-6 pb-32">
          {/* Patient & Main Info */}
          <section className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-6">
            <div className="flex items-start gap-5">
              <div className="w-16 h-16 rounded-full bg-[#e1e0ff] text-[#4648d4] flex items-center justify-center text-[20px] font-bold shrink-0">
                {patientInitials(appt.patient.fullName)}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[22px] font-semibold text-[#0f172a] leading-tight">
                  {appt.patient.fullName}
                </h2>
                <p className="text-[14px] text-[#64748b] mt-1 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">call</span>
                  {appt.patient.phone}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-y-4 gap-x-6 mt-6 pt-6 border-t border-[#e2e8f0]">
              <div>
                <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-1">
                  Data e Hora
                </p>
                <p className="text-[14px] font-medium text-[#0f172a] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#4648d4] text-[18px]">
                    calendar_today
                  </span>
                  {formatDateTime(appt.startsAt, appt.endsAt)}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-1">
                  Tipo de Consulta
                </p>
                <p className="text-[14px] font-medium text-[#0f172a]">{TYPE_LABELS[appt.type]}</p>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-1">
                  Convênio / Pagamento
                </p>
                <p className="text-[14px] font-medium text-[#0f172a]">{appt.insurance}</p>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-1">
                  Valor
                </p>
                <p className="text-[14px] font-medium text-[#0f172a]">
                  {appt.value != null
                    ? appt.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                    : '—'}
                </p>
              </div>
            </div>

            {appt.observations && (
              <div className="mt-4 pt-4 border-t border-dashed border-[#e2e8f0]">
                <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-2">
                  Observações do Agendamento
                </p>
                <p className="text-[13px] text-[#64748b] bg-[#f8fafc] p-3 rounded-lg border border-[#e2e8f0]/50">
                  {appt.observations}
                </p>
              </div>
            )}

            {terminal && appt.cancelReason && (
              <div className="mt-4 pt-4 border-t border-dashed border-[#e2e8f0]">
                <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-2">
                  Motivo do Cancelamento
                </p>
                <p className="text-[13px] text-[#ba1a1a] bg-[#ffdad6]/30 p-3 rounded-lg border border-[#ba1a1a]/10">
                  {appt.cancelReason}
                </p>
              </div>
            )}
          </section>

          {/* Event Timeline */}
          <section className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-6">
            <h3 className="text-[16px] font-semibold text-[#0f172a] mb-5 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#4648d4] text-[20px]">history</span>
              Histórico da Consulta
            </h3>
            <StatusTimeline events={events} />
          </section>
        </main>

        {/* Sticky footer actions */}
        {!terminal && (
          <footer className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-[#e2e8f0] px-4 md:px-8 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
            <div className="max-w-4xl mx-auto">
              <StatusActions
                currentStatus={appt.status}
                onTransition={handleTransition}
                onEdit={() => setShowEdit(true)}
                loading={transitioning}
              />
            </div>
          </footer>
        )}
      </div>

      {showCancel && (
        <CancelAppointmentModal
          appointment={appt}
          onClose={() => {
            setShowCancel(false);
            router.refresh();
          }}
        />
      )}

      {showEdit && (
        <EditAppointmentModal
          appointment={appt}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
