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
  highlight,
}: {
  icon: string;
  label: string;
  count: number;
  iconClass: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-3 ${
        highlight ? 'border-[#ffdcc5] bg-[#fff7f0]' : 'border-[#e2e8f0] bg-white'
      }`}
    >
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
      tarde.push(appt);
    }
  }

  return { manha, tarde };
}

function formatDayLabel(date: Date): string {
  const day = format(date, 'd', { locale: ptBR });
  const month = format(date, 'MMM', { locale: ptBR });
  const monthCap = month.charAt(0).toUpperCase() + month.slice(1).replace('.', '');
  return `${day} ${monthCap}`;
}

export function DayPanel({ selectedDay, onNewAppointment, onCancelAppointment }: DayPanelProps) {
  const isoDate = format(selectedDay, 'yyyy-MM-dd');

  const { data: appointments, status } = useQuery<AppointmentResponse[]>({
    queryKey: ['appointments-day', isoDate],
    queryFn: () => fetchDayAppointments(isoDate),
    staleTime: 2 * 60 * 1000,
  });

  const all = appointments ?? [];
  const totalCount = all.length;
  const confirmadosCount = all.filter((a) => a.status === 'CONFIRMADO').length;
  const aguardandoCount = all.filter((a) => a.status === 'AGUARDANDO').length;
  const finalizadosCount = all.filter((a) => a.status === 'REALIZADO').length;

  const { manha, tarde } = groupByPeriod(all);

  return (
    <div className="flex flex-col gap-4">
      {/* Resumo do dia */}
      <div>
        <h2 className="text-sm font-semibold text-[#475569] uppercase tracking-wider mb-3">
          Resumo do dia{' '}
          <span className="text-[#1b1b23] normal-case tracking-normal">
            ({formatDayLabel(selectedDay)})
          </span>
        </h2>

        {/* Stats 2×2 grid */}
        <div className="grid grid-cols-2 gap-2">
          <StatBox
            icon="calendar_month"
            label="Total"
            count={totalCount}
            iconClass="text-[#4648d4]"
          />
          <StatBox
            icon="check_circle"
            label="Confirmados"
            count={confirmadosCount}
            iconClass="text-green-600"
          />
          <StatBox
            icon="schedule"
            label="Aguardando"
            count={aguardandoCount}
            iconClass="text-[#b55d00]"
            highlight={aguardandoCount > 0}
          />
          <StatBox
            icon="task_alt"
            label="Finalizados"
            count={finalizadosCount}
            iconClass="text-[#475569]"
          />
        </div>
      </div>

      {/* Consultas de Hoje */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[#1b1b23]">Consultas de Hoje</h3>
          <div className="flex items-center gap-2">
            <button type="button" className="text-xs font-medium text-[#4648d4] hover:underline">
              Ver todas
            </button>
            <span className="text-[#cbd5e1]">·</span>
            <button
              type="button"
              onClick={onNewAppointment}
              className="flex items-center gap-1 text-xs font-medium text-[#4648d4] hover:underline"
              aria-label="Novo agendamento"
            >
              <span className="material-symbols-outlined text-sm leading-none">add</span>
              Agendar
            </button>
          </div>
        </div>

        {/* Loading */}
        {status === 'pending' && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <span className="material-symbols-outlined text-3xl text-red-400 mb-2">error</span>
            <p className="text-sm text-[#64748b]">Erro ao carregar agendamentos.</p>
          </div>
        )}

        {/* Empty state */}
        {status === 'success' && all.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
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
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
                    Manhã
                  </h4>
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
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
                    Tarde
                  </h4>
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
    </div>
  );
}
