'use client';

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppointmentCard } from '@/components/appointments/appointment-card';
import { fetchDayAppointments } from '@/lib/appointments';
import type { AppointmentResponse } from '@medschedule/shared';

interface DayPanelProps {
  selectedDay: Date;
  onNewAppointment: () => void;
  onCancelAppointment: (appt: AppointmentResponse) => void;
}

function SkeletonCard() {
  return <div className="h-20 bg-[#f1f5f9] rounded-lg animate-pulse" />;
}

function StatBox({
  icon,
  label,
  count,
  iconClass,
}: {
  icon: string;
  label: string;
  count: number;
  iconClass: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-[#e2e8f0] bg-white p-3">
      <span className={`material-symbols-outlined text-xl leading-none ${iconClass}`}>{icon}</span>
      <span className="text-lg font-semibold text-[#0f172a]">{count}</span>
      <span className="text-[11px] text-[#64748b]">{label}</span>
    </div>
  );
}

function groupByPeriod(appointments: AppointmentResponse[]): {
  manha: AppointmentResponse[];
  tarde: AppointmentResponse[];
} {
  const manha: AppointmentResponse[] = [];
  const tarde: AppointmentResponse[] = [];

  for (const appt of appointments) {
    const d = new Date(appt.startsAt);
    // Use BRT hours via Intl
    const brtHour = parseInt(
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        hour12: false,
      }).format(d),
      10,
    );
    if (brtHour >= 7 && brtHour <= 11) {
      manha.push(appt);
    } else {
      // 12:00 onwards (up to 18:30) → Tarde
      tarde.push(appt);
    }
  }

  return { manha, tarde };
}

export function DayPanel({ selectedDay, onNewAppointment, onCancelAppointment }: DayPanelProps) {
  const isoDate = format(selectedDay, 'yyyy-MM-dd');

  const { data: appointments, status } = useQuery<AppointmentResponse[]>({
    queryKey: ['appointments-day', isoDate],
    queryFn: () => fetchDayAppointments(isoDate),
    staleTime: 2 * 60 * 1000,
  });

  const formattedDate = format(selectedDay, "EEEE, d 'de' MMMM", { locale: ptBR });
  const formattedDateCapitalized = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  // Compute stats
  const all = appointments ?? [];
  const agendadosCount = all.filter((a) =>
    ['AGENDADO', 'CONFIRMADO', 'EM_ATENDIMENTO'].includes(a.status),
  ).length;
  const aguardandoCount = all.filter((a) => a.status === 'AGUARDANDO').length;
  const realizadosCount = all.filter((a) => a.status === 'REALIZADO').length;
  const canceladosCount = all.filter((a) => a.status === 'CANCELADO').length;

  const { manha, tarde } = groupByPeriod(all);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-[#0f172a] capitalize">
          {formattedDateCapitalized}
        </h2>
        <button
          type="button"
          onClick={onNewAppointment}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#4648d4] px-3 py-2 text-sm font-medium text-white hover:bg-[#3537b3] transition-colors shrink-0"
        >
          <span className="material-symbols-outlined text-base leading-none" aria-hidden="true">
            add
          </span>
          Novo agendamento
        </button>
      </div>

      {/* Stats 2x2 grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatBox
          icon="calendar_month"
          label="Agendados"
          count={agendadosCount}
          iconClass="text-[#4648d4]"
        />
        <StatBox
          icon="schedule"
          label="Aguardando"
          count={aguardandoCount}
          iconClass="text-[#b55d00]"
        />
        <StatBox
          icon="check_circle"
          label="Realizados"
          count={realizadosCount}
          iconClass="text-green-600"
        />
        <StatBox
          icon="cancel"
          label="Cancelados"
          count={canceladosCount}
          iconClass="text-[#ba1a1a]"
        />
      </div>

      {/* Loading */}
      {status === 'pending' && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <span className="material-symbols-outlined text-3xl text-red-400 mb-2">error</span>
          <p className="text-sm text-[#64748b]">Erro ao carregar agendamentos.</p>
        </div>
      )}

      {/* Empty state */}
      {status === 'success' && all.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <span className="material-symbols-outlined text-4xl text-[#94a3b8] mb-2">
            calendar_today
          </span>
          <p className="text-sm text-[#64748b]">Nenhum agendamento neste dia</p>
        </div>
      )}

      {/* Appointment groups */}
      {status === 'success' && all.length > 0 && (
        <div className="flex flex-col gap-4">
          {manha.length > 0 && (
            <section>
              <div className="flex items-center gap-1.5 mb-2">
                <span
                  className="material-symbols-outlined text-base leading-none text-[#b55d00]"
                  aria-hidden="true"
                >
                  light_mode
                </span>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
                  Manhã
                </h3>
              </div>
              <div className="flex flex-col gap-2">
                {manha.map((appt) => (
                  <AppointmentCard
                    key={appt.id}
                    appointment={appt}
                    {...(appt.status !== 'CANCELADO' && appt.status !== 'REALIZADO'
                      ? { onClick: () => onCancelAppointment(appt) }
                      : {})}
                  />
                ))}
              </div>
            </section>
          )}

          {tarde.length > 0 && (
            <section>
              <div className="flex items-center gap-1.5 mb-2">
                <span
                  className="material-symbols-outlined text-base leading-none text-[#475569]"
                  aria-hidden="true"
                >
                  routine
                </span>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
                  Tarde
                </h3>
              </div>
              <div className="flex flex-col gap-2">
                {tarde.map((appt) => (
                  <AppointmentCard
                    key={appt.id}
                    appointment={appt}
                    {...(appt.status !== 'CANCELADO' && appt.status !== 'REALIZADO'
                      ? { onClick: () => onCancelAppointment(appt) }
                      : {})}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
