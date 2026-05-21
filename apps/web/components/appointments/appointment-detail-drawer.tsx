'use client';

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type {
  AppointmentResponse,
  AppointmentEventResponse,
  AppointmentStatus,
} from '@medschedule/shared';
import { isTerminal } from '@medschedule/shared';
import { RightDrawer } from '@/components/shared/right-drawer';
import { StatusBadge } from '@/components/shared/status-badge';
import { StatusTimeline } from '@/components/appointments/status-timeline';
import { StatusActions } from '@/components/appointments/status-actions';
import { CancelAppointmentModal } from '@/components/appointments/cancel-appointment-modal';
import { EditAppointmentModal } from '@/components/appointments/edit-appointment-modal';
import { NotesModal } from '@/components/notes/notes-modal';
import {
  fetchAppointment,
  fetchAppointmentEvents,
  transitionAppointment,
} from '@/lib/appointments';

const TYPE_LABELS: Record<AppointmentResponse['type'], string> = {
  CONSULTA: 'Consulta',
  RETORNO: 'Retorno',
  AVALIACAO: 'Avaliação',
  PROCEDIMENTO: 'Procedimento',
};

function patientInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
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

function invalidateAll(qc: ReturnType<typeof useQueryClient>, appointmentId: string) {
  qc.invalidateQueries({ queryKey: ['appointment', appointmentId] });
  qc.invalidateQueries({ queryKey: ['appointment', appointmentId, 'events'] });
  qc.invalidateQueries({ queryKey: ['appointments-day'] });
  qc.invalidateQueries({ queryKey: ['month-summary'] });
  qc.invalidateQueries({ queryKey: ['dashboard'] });
}

interface AppointmentDetailDrawerProps {
  appointmentId: string | null;
  onClose: () => void;
}

interface DrawerBodyProps {
  appointmentId: string;
  onClose: () => void;
}

function DrawerBody({ appointmentId, onClose }: DrawerBodyProps) {
  const qc = useQueryClient();
  const [transitioning, setTransitioning] = useState(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const [showCancel, setShowCancel] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  const apptQuery = useQuery<AppointmentResponse>({
    queryKey: ['appointment', appointmentId],
    queryFn: () => fetchAppointment(appointmentId),
  });

  const eventsQuery = useQuery<AppointmentEventResponse[]>({
    queryKey: ['appointment', appointmentId, 'events'],
    queryFn: () => fetchAppointmentEvents(appointmentId),
  });

  const handleTransition = useCallback(
    async (to: AppointmentStatus) => {
      if (to === 'CANCELADO') {
        setShowCancel(true);
        return;
      }
      setTransitioning(true);
      setTransitionError(null);
      try {
        await transitionAppointment(appointmentId, to);
        invalidateAll(qc, appointmentId);
      } catch (err: unknown) {
        setTransitionError(err instanceof Error ? err.message : 'Erro ao atualizar status.');
      } finally {
        setTransitioning(false);
      }
    },
    [appointmentId, qc],
  );

  // ── Loading skeleton ───────────────────────────────────────────────────
  if (apptQuery.status === 'pending') {
    return (
      <RightDrawer open onClose={onClose} title="Detalhe do Agendamento">
        <div className="space-y-4">
          <div className="h-32 bg-white rounded-xl border border-[#e2e8f0] animate-pulse" />
          <div className="h-48 bg-white rounded-xl border border-[#e2e8f0] animate-pulse" />
        </div>
      </RightDrawer>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────
  if (apptQuery.status === 'error') {
    const err = apptQuery.error as Error & { status?: number };
    const isNotFound = err.status === 404;
    return (
      <RightDrawer open onClose={onClose} title="Detalhe do Agendamento">
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-8 text-center">
          <span className="material-symbols-outlined text-[40px] text-[#94a3b8] mb-3 block">
            {isNotFound ? 'search_off' : 'error'}
          </span>
          <p className="text-[14px] text-[#64748b] mb-4">
            {isNotFound ? 'Consulta não encontrada.' : err.message}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#4648d4] text-white text-[13px] font-semibold hover:opacity-90"
          >
            Fechar
          </button>
        </div>
      </RightDrawer>
    );
  }

  const appt = apptQuery.data;
  const events = eventsQuery.data ?? [];
  const terminal = isTerminal(appt.status);

  const headerActions = !terminal ? (
    <button
      type="button"
      onClick={() => setShowCancel(true)}
      disabled={transitioning}
      className="text-[12px] font-semibold text-[#ba1a1a] border border-[#ba1a1a]/30 rounded-lg px-3 py-1.5 hover:bg-[#ffdad6] bg-white disabled:opacity-40"
    >
      Cancelar
    </button>
  ) : null;

  const footer = !terminal ? (
    <div className="space-y-2">
      {transitionError && (
        <p className="text-[13px] text-[#ba1a1a] bg-[#ffdad6]/40 px-3 py-2 rounded-lg border border-[#ba1a1a]/20 text-center">
          {transitionError}
        </p>
      )}
      <StatusActions
        currentStatus={appt.status}
        onTransition={handleTransition}
        onEdit={() => setShowEdit(true)}
        loading={transitioning}
      />
    </div>
  ) : undefined;

  return (
    <>
      <RightDrawer
        open
        onClose={onClose}
        title="Detalhe do Agendamento"
        headerActions={headerActions ?? undefined}
        footer={footer}
      >
        <div className="space-y-6">
          {/* Patient & Main Info */}
          <section className="relative bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-6">
            <div className="absolute top-4 right-4">
              <StatusBadge status={appt.status} />
            </div>
            <div className="flex items-start gap-5">
              <div className="w-14 h-14 rounded-full bg-[#e1e0ff] text-[#4648d4] flex items-center justify-center text-[18px] font-bold shrink-0">
                {patientInitials(appt.patient.fullName)}
              </div>
              <div className="flex-1 min-w-0 pr-24">
                <h3 className="text-[20px] font-semibold text-[#0f172a] leading-tight truncate">
                  {appt.patient.fullName}
                </h3>
                <p className="text-[13px] text-[#64748b] mt-1 flex items-center gap-2">
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
                <p className="text-[13px] font-medium text-[#0f172a] flex items-center gap-2">
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
                <p className="text-[13px] font-medium text-[#0f172a]">{TYPE_LABELS[appt.type]}</p>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-1">
                  Convênio / Pagamento
                </p>
                <p className="text-[13px] font-medium text-[#0f172a]">{appt.insurance}</p>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-1">
                  Valor
                </p>
                <p className="text-[13px] font-medium text-[#0f172a]">
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

          {appt.status === 'REALIZADO' && (
            <section className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-[14px] font-semibold text-[#0f172a] flex items-center gap-2">
                  <span
                    className="material-symbols-outlined text-[#4648d4] text-[18px]"
                    aria-hidden="true"
                  >
                    edit_note
                  </span>
                  Observações Clínicas
                </h3>
                <p className="mt-1 text-[12px] text-[#64748b]">
                  Registre o atendimento. As versões são preservadas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNotes(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#4648d4] text-white text-[12px] font-semibold shadow-sm hover:bg-[#3a3cb8] shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]">stylus_note</span>
                Abrir editor
              </button>
            </section>
          )}

          <section className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-5">
            <h3 className="text-[14px] font-semibold text-[#0f172a] mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#4648d4] text-[18px]">history</span>
              Histórico da Consulta
            </h3>
            {eventsQuery.status === 'pending' ? (
              <div className="h-24 bg-[#f1f5f9] rounded-lg animate-pulse" />
            ) : (
              <StatusTimeline events={events} />
            )}
          </section>
        </div>
      </RightDrawer>

      {showCancel && (
        <CancelAppointmentModal
          appointment={appt}
          onClose={() => {
            setShowCancel(false);
            invalidateAll(qc, appointmentId);
          }}
        />
      )}

      {showEdit && (
        <EditAppointmentModal
          appointment={appt}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false);
            invalidateAll(qc, appointmentId);
          }}
        />
      )}

      {showNotes && (
        <NotesModal appointmentId={appt.id} open={showNotes} onClose={() => setShowNotes(false)} />
      )}
    </>
  );
}

export function AppointmentDetailDrawer({ appointmentId, onClose }: AppointmentDetailDrawerProps) {
  if (!appointmentId) return null;
  // Key by appointmentId so internal state resets when switching between appointments.
  return <DrawerBody key={appointmentId} appointmentId={appointmentId} onClose={onClose} />;
}
