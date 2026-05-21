'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type {
  AppointmentResponse,
  AppointmentEventResponse,
  AppointmentStatus,
  ClinicalNoteResponse,
  TiptapDoc,
} from '@medschedule/shared';
import { isTerminal } from '@medschedule/shared';
import { RightDrawer } from '@/components/shared/right-drawer';
import { StatusBadge } from '@/components/shared/status-badge';
import { StatusTimeline } from '@/components/appointments/status-timeline';
import { StatusActions } from '@/components/appointments/status-actions';
import { CancelAppointmentModal } from '@/components/appointments/cancel-appointment-modal';
import { EditAppointmentModal } from '@/components/appointments/edit-appointment-modal';
import { NoteEditor } from '@/components/notes/note-editor';
import { NoteHistoryDrawer } from '@/components/notes/note-history-drawer';
import {
  fetchAppointment,
  fetchAppointmentEvents,
  transitionAppointment,
} from '@/lib/appointments';
import { fetchAppointmentNotes, createAppointmentNote, patchClinicalNote } from '@/lib/notes';
import { getInitials } from '@/lib/utils';
import { APPOINTMENT_TYPE_LABELS } from '@/lib/appointment-status';

const EMPTY_DOC: TiptapDoc = { type: 'doc', content: [{ type: 'paragraph' }] };

function formatDateTime(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const date = format(start, "d 'de' MMM yyyy", { locale: ptBR });
  const timeRange = `${format(start, 'HH:mm')} – ${format(end, 'HH:mm')}`;
  return `${date}, ${timeRange}`;
}

function formatHHMM(iso: string): string {
  return format(new Date(iso), 'HH:mm');
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
  status: AppointmentStatus | null;
  onClose: () => void;
}

interface NoteSectionProps {
  appointmentId: string;
  canSave: boolean;
}

function NoteSection({ appointmentId, canSave }: NoteSectionProps) {
  const qc = useQueryClient();
  const draftRef = useRef<TiptapDoc>(EMPTY_DOC);
  const [showHistory, setShowHistory] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [justSavedAt, setJustSavedAt] = useState<string | null>(null);

  const notesQuery = useQuery({
    queryKey: ['notes', appointmentId],
    queryFn: ({ signal }) => fetchAppointmentNotes(appointmentId, { signal }),
    staleTime: 30_000,
  });

  const currentNote: ClinicalNoteResponse | undefined = notesQuery.data?.[0];
  const initialDoc: TiptapDoc = currentNote?.revisions[0]?.content ?? EMPTY_DOC;
  const latestRevisionAt = currentNote?.revisions[0]?.createdAt ?? null;

  // Seed draftRef when the note identity changes — so save() ships loaded content
  // if the user opens and clicks save without typing.
  useEffect(() => {
    draftRef.current = currentNote?.revisions[0]?.content ?? EMPTY_DOC;
  }, [currentNote]);

  // Clear the "Salvo HH:MM" flash after ~3s
  useEffect(() => {
    if (!justSavedAt) return;
    const t = setTimeout(() => setJustSavedAt(null), 3000);
    return () => clearTimeout(t);
  }, [justSavedAt]);

  const save = useMutation({
    mutationFn: async () => {
      const doc = draftRef.current;
      if (currentNote) {
        return patchClinicalNote(currentNote.id, { content: doc });
      }
      return createAppointmentNote(appointmentId, { content: doc });
    },
    onSuccess: () => {
      setSaveError(null);
      setJustSavedAt(new Date().toISOString());
      void qc.invalidateQueries({ queryKey: ['notes', appointmentId] });
    },
    onError: (err: Error) => {
      setSaveError(err.message);
    },
  });

  const editorKey = `${currentNote?.id ?? 'new'}:${currentNote?.revisions[0]?.id ?? 'fresh'}`;

  const autosaveLabel = justSavedAt
    ? `Salvo ${formatHHMM(justSavedAt)}`
    : latestRevisionAt
      ? `Autosave ${formatHHMM(latestRevisionAt)}`
      : null;

  return (
    <>
      <section className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#e2e8f0] bg-[#f8fafc] flex items-center justify-between gap-3">
          <h3 className="text-[14px] font-semibold text-[#0f172a] flex items-center gap-2">
            <span
              className="material-symbols-outlined text-[#4648d4] text-[18px]"
              aria-hidden="true"
            >
              edit_note
            </span>
            Anotação Clínica
          </h3>
          {autosaveLabel && (
            <span className="text-[11px] text-[#94a3b8] font-medium">{autosaveLabel}</span>
          )}
        </div>

        <div className="p-5">
          {notesQuery.isSuccess ? (
            <NoteEditor
              key={editorKey}
              initialContent={initialDoc}
              onChange={(doc) => {
                draftRef.current = doc;
              }}
            />
          ) : notesQuery.isError ? (
            <p className="text-[13px] text-[#ba1a1a]">
              Erro ao carregar anotação. Tente fechar e reabrir o detalhe.
            </p>
          ) : (
            <p className="text-[13px] text-[#64748b]">Carregando…</p>
          )}

          {saveError && (
            <p className="mt-3 text-[13px] text-[#ba1a1a] bg-[#ffdad6]/40 px-3 py-2 rounded-lg border border-[#ba1a1a]/20">
              {saveError}
            </p>
          )}
        </div>

        <div className="px-6 py-3 border-t border-[#e2e8f0] bg-[#f8fafc] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setShowHistory(true)}
            disabled={!currentNote}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-[#475569] hover:bg-white border border-[#e2e8f0] bg-white disabled:opacity-40 disabled:hover:bg-white"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              history
            </span>
            Histórico de revisões
          </button>

          <div className="flex items-center gap-3">
            {!canSave && (
              <span className="text-[11px] text-[#94a3b8] font-medium">
                Finalize a consulta para salvar
              </span>
            )}
            <button
              type="button"
              onClick={() => save.mutate()}
              disabled={!canSave || save.isPending || !notesQuery.isSuccess}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#4648d4] text-white text-[12px] font-semibold shadow-sm hover:bg-[#3a3cb8] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                save
              </span>
              {save.isPending ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>
      </section>

      <NoteHistoryDrawer
        note={currentNote ?? null}
        open={showHistory}
        onClose={() => setShowHistory(false)}
      />
    </>
  );
}

function DrawerBody({ appointmentId, onClose }: Omit<DrawerBodyProps, 'status'>) {
  const qc = useQueryClient();
  const [transitioning, setTransitioning] = useState(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const [showCancel, setShowCancel] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

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
  const canSaveNote = appt.status === 'REALIZADO';

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
                {getInitials(appt.patient.fullName)}
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
                <p className="text-[13px] font-medium text-[#0f172a]">
                  {APPOINTMENT_TYPE_LABELS[appt.type]}
                </p>
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

          {/* Anotação Clínica — inline editor (visible for all statuses, save gated on REALIZADO) */}
          {appt.status !== 'CANCELADO' && (
            <NoteSection appointmentId={appt.id} canSave={canSaveNote} />
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
    </>
  );
}

export function AppointmentDetailDrawer({ appointmentId, onClose }: AppointmentDetailDrawerProps) {
  if (!appointmentId) return null;
  // Key by appointmentId so internal state resets when switching between appointments.
  return <DrawerBody key={appointmentId} appointmentId={appointmentId} onClose={onClose} />;
}
