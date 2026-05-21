'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppointmentCard } from '@/components/appointments/appointment-card';
import { QuickActionsMenu } from '@/components/appointments/quick-actions-menu';
import { fetchDayAppointments } from '@/lib/appointments';
import { groupByPeriod } from '@/lib/group-by-period';
import type { AppointmentResponse } from '@medschedule/shared';

interface DayPanelProps {
  selectedDay: Date;
  onCancelAppointment: (appt: AppointmentResponse) => void;
}

function SkeletonCard() {
  return <div className="h-20 bg-[#f1f5f9] rounded-lg animate-pulse" />;
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

  const { manha, tarde, noite } = groupByPeriod(all);

  return (
    <>
      {/* Card 1 — Resumo do dia */}
      <div className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm p-5">
        <h4 className="text-[18px] font-semibold text-[#0f172a] mb-4 pb-2 border-b border-[#cbd5e1]">
          Resumo do dia ({formatDayLabel(selectedDay)})
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#f8fafc] p-3 rounded-lg border border-[#cbd5e1]">
            <div className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[#475569] mb-1">
              Total
            </div>
            <div className="text-[24px] font-semibold leading-8 text-[#0f172a]">{totalCount}</div>
          </div>
          <div className="bg-[#e1e0ff]/30 p-3 rounded-lg border border-[#c0c1ff]">
            <div className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[#2f2ebe] mb-1">
              Confirmados
            </div>
            <div className="text-[24px] font-semibold leading-8 text-[#4648d4]">
              {confirmadosCount}
            </div>
          </div>
          <div className="bg-[#ffdcc5]/30 p-3 rounded-lg border border-[#ffb783]">
            <div className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[#703700] mb-1">
              Aguardando
            </div>
            <div className="text-[24px] font-semibold leading-8 text-[#b55d00]">
              {aguardandoCount}
            </div>
          </div>
          <div className="bg-[#f1f5f9] p-3 rounded-lg border border-[#cbd5e1]">
            <div className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[#475569] mb-1">
              Finalizados
            </div>
            <div className="text-[24px] font-semibold leading-8 text-[#0f172a]">
              {finalizadosCount}
            </div>
          </div>
        </div>
      </div>

      {/* Card 2 — Consultas de Hoje. On desktop (xl), constrain height so the list
          scrolls inside the card instead of clipping. On mobile, let it flow naturally. */}
      <div className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm flex flex-col xl:min-h-0 xl:max-h-[calc(100vh-300px)]">
        <div className="p-5 border-b border-[#cbd5e1] flex justify-between items-center shrink-0">
          <h4 className="text-[18px] font-semibold text-[#0f172a]">Consultas de Hoje</h4>
          <Link
            href="/consultas"
            className="text-[12px] font-semibold text-[#4648d4] hover:underline"
          >
            Ver todas
          </Link>
        </div>

        <div className="p-4 flex flex-col gap-6 xl:overflow-y-auto xl:flex-1 xl:min-h-0">
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
            <>
              {manha.length > 0 && (
                <section>
                  <h5 className="text-[11px] font-medium uppercase tracking-wider text-[#94a3b8] mb-3 flex items-center gap-2">
                    <span
                      className="material-symbols-outlined text-[16px] leading-none"
                      aria-hidden="true"
                    >
                      wb_sunny
                    </span>
                    Manhã
                  </h5>
                  <div className="flex flex-col gap-3">
                    {manha.map((appt) => (
                      <Link key={appt.id} href={`/consultas?id=${appt.id}`} className="block">
                        <AppointmentCard
                          appointment={appt}
                          variant="calendar"
                          rightSlot={
                            <QuickActionsMenu
                              appointment={appt}
                              queryKey={['appointments-day', isoDate]}
                              onCancelRequest={onCancelAppointment}
                            />
                          }
                        />
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {tarde.length > 0 && (
                <section>
                  <h5 className="text-[11px] font-medium uppercase tracking-wider text-[#94a3b8] mb-3 flex items-center gap-2">
                    <span
                      className="material-symbols-outlined text-[16px] leading-none"
                      aria-hidden="true"
                    >
                      light_mode
                    </span>
                    Tarde
                  </h5>
                  <div className="flex flex-col gap-3">
                    {tarde.map((appt) => (
                      <Link key={appt.id} href={`/consultas?id=${appt.id}`} className="block">
                        <AppointmentCard
                          appointment={appt}
                          variant="calendar"
                          rightSlot={
                            <QuickActionsMenu
                              appointment={appt}
                              queryKey={['appointments-day', isoDate]}
                              onCancelRequest={onCancelAppointment}
                            />
                          }
                        />
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {noite.length > 0 && (
                <section>
                  <h5 className="text-[11px] font-medium uppercase tracking-wider text-[#94a3b8] mb-3 flex items-center gap-2">
                    <span
                      className="material-symbols-outlined text-[16px] leading-none"
                      aria-hidden="true"
                    >
                      dark_mode
                    </span>
                    Noite
                  </h5>
                  <div className="flex flex-col gap-3">
                    {noite.map((appt) => (
                      <Link key={appt.id} href={`/consultas?id=${appt.id}`} className="block">
                        <AppointmentCard
                          appointment={appt}
                          variant="calendar"
                          rightSlot={
                            <QuickActionsMenu
                              appointment={appt}
                              queryKey={['appointments-day', isoDate]}
                              onCancelRequest={onCancelAppointment}
                            />
                          }
                        />
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
