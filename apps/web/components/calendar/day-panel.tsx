'use client';

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppointmentCard } from '@/components/appointments/appointment-card';
import { fetchDayAppointments } from '@/lib/appointments';
import type { AppointmentResponse } from '@medschedule/shared';

interface DayPanelProps {
  selectedDay: Date;
  onCancelAppointment: (appt: AppointmentResponse) => void;
}

function SkeletonCard() {
  return <div className="h-20 bg-[#f1f5f9] rounded-lg animate-pulse" />;
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

export function DayPanel({ selectedDay, onCancelAppointment }: DayPanelProps) {
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
        <h2 className="text-[20px] font-semibold text-[#0f172a] mb-4 pb-2 border-b border-[#cbd5e1]">
          Resumo do dia ({formatDayLabel(selectedDay)})
        </h2>

        {/* Stats 2×2 grid — no icons, label above count */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#f8fafc] p-3 rounded-lg border border-[#cbd5e1]">
            <div className="text-[12px] font-medium text-[#475569] mb-1">Total</div>
            <div className="text-[28px] font-semibold text-[#0f172a] leading-tight">
              {totalCount}
            </div>
          </div>
          <div className="bg-[#e1e0ff]/30 p-3 rounded-lg border border-[#c0c1ff]">
            <div className="text-[12px] font-medium text-[#2f2ebe] mb-1">Confirmados</div>
            <div className="text-[28px] font-semibold text-[#4648d4] leading-tight">
              {confirmadosCount}
            </div>
          </div>
          <div className="bg-[#ffdcc5]/30 p-3 rounded-lg border border-[#ffb783]">
            <div className="text-[12px] font-medium text-[#703700] mb-1">Aguardando</div>
            <div className="text-[28px] font-semibold text-[#b55d00] leading-tight">
              {aguardandoCount}
            </div>
          </div>
          <div className="bg-[#f1f5f9] p-3 rounded-lg border border-[#cbd5e1]">
            <div className="text-[12px] font-medium text-[#475569] mb-1">Finalizados</div>
            <div className="text-[28px] font-semibold text-[#0f172a] leading-tight">
              {finalizadosCount}
            </div>
          </div>
        </div>
      </div>

      {/* Consultas de Hoje */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[#1b1b23]">Consultas de Hoje</h3>
          <button type="button" className="text-xs font-medium text-[#4648d4] hover:underline">
            Ver todas
          </button>
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
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="material-symbols-outlined text-base leading-none text-[#94a3b8]"
                    aria-hidden="true"
                  >
                    wb_sunny
                  </span>
                  <h4 className="text-[11px] uppercase tracking-wider text-[#94a3b8]">Manhã</h4>
                </div>
                <div className="flex flex-col gap-2">
                  {manha.map((appt) => (
                    <AppointmentCard
                      key={appt.id}
                      appointment={appt}
                      variant="calendar"
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
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="material-symbols-outlined text-base leading-none text-[#94a3b8]"
                    aria-hidden="true"
                  >
                    light_mode
                  </span>
                  <h4 className="text-[11px] uppercase tracking-wider text-[#94a3b8]">Tarde</h4>
                </div>
                <div className="flex flex-col gap-2">
                  {tarde.map((appt) => (
                    <AppointmentCard
                      key={appt.id}
                      appointment={appt}
                      variant="calendar"
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
