'use client';

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { fetchDashboardToday, fetchDashboardKpis } from '@/lib/dashboard';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { NextAppointmentsPanel } from '@/components/dashboard/next-appointments-panel';
import { StatusDayPanel } from '@/components/dashboard/status-day-panel';
import { MiniCalendarCard } from '@/components/dashboard/mini-calendar-card';

export function DashboardClient() {
  const today = useQuery({
    queryKey: ['dashboard', 'today'],
    queryFn: ({ signal }) => fetchDashboardToday({ signal }),
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });

  const kpis = useQuery({
    queryKey: ['dashboard', 'kpis', 'week'],
    queryFn: ({ signal }) => fetchDashboardKpis('week', { signal }),
    refetchOnWindowFocus: true,
    staleTime: 60_000,
  });

  const now = new Date();
  const greetingDate = format(now, "EEEE, d 'de' MMMM", { locale: ptBR });

  if (today.isError || kpis.isError) {
    return (
      <div className="p-8">
        <p className="text-[14px] text-[#ba1a1a]">Erro ao carregar dashboard. Atualize a página.</p>
      </div>
    );
  }

  const t = today.data;
  const k = kpis.data;
  const loading = today.isLoading || kpis.isLoading;
  const attendancePct = k ? Math.round(k.attendanceRate * 100) : 0;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <header className="px-4 md:px-8 pt-8 pb-4">
        <p className="text-[12px] text-[#64748b] uppercase tracking-wide font-semibold">
          {greetingDate}
        </p>
        <h1 className="mt-1 text-[28px] font-semibold text-[#0f172a]">Dashboard</h1>
      </header>

      <main className="px-4 md:px-8 pb-10 space-y-6 max-w-[1280px] mx-auto">
        <section
          aria-label="Indicadores"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <KpiCard
            label="Consultas hoje"
            value={loading ? '—' : (t?.totalToday ?? 0)}
            icon="event"
          />
          <KpiCard
            label="Próximos"
            value={loading ? '—' : (t?.nextAppointments.length ?? 0)}
            icon="schedule"
            hint="restantes hoje"
          />
          <KpiCard
            label="Realizadas hoje"
            value={loading ? '—' : (t?.completedToday ?? 0)}
            icon="check_circle"
            tone="positive"
          />
          <KpiCard
            label="Canceladas hoje"
            value={loading ? '—' : (t?.cancelledToday ?? 0)}
            icon="cancel"
            tone="negative"
          />
        </section>

        <section aria-label="Resumo da semana" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            label="Esta semana"
            value={loading ? '—' : (k?.total ?? 0)}
            icon="calendar_view_week"
            hint="agendamentos"
          />
          <KpiCard
            label="Realizadas (semana)"
            value={loading ? '—' : (k?.completed ?? 0)}
            icon="task_alt"
            tone="positive"
          />
          <KpiCard
            label="Taxa de comparecimento"
            value={loading ? '—' : `${attendancePct}%`}
            icon="trending_up"
            hint="realizadas / (realizadas + canceladas)"
            tone="positive"
          />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <NextAppointmentsPanel items={t?.nextAppointments ?? []} />
          </div>
          <StatusDayPanel byStatus={{ ...buildEmptyByStatus(), ...(t?.byStatus ?? {}) }} />
        </section>

        <section className="grid grid-cols-1">
          <MiniCalendarCard />
        </section>
      </main>
    </div>
  );
}

function buildEmptyByStatus(): Record<
  'AGENDADO' | 'CONFIRMADO' | 'AGUARDANDO' | 'EM_ATENDIMENTO' | 'REALIZADO' | 'CANCELADO',
  number
> {
  return {
    AGENDADO: 0,
    CONFIRMADO: 0,
    AGUARDANDO: 0,
    EM_ATENDIMENTO: 0,
    REALIZADO: 0,
    CANCELADO: 0,
  };
}
