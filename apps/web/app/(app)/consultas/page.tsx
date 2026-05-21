'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import type { AppointmentResponse } from '@medschedule/shared';
import { StatusBadge } from '@/components/shared/status-badge';
import { AppointmentDetailDrawer } from '@/components/appointments/appointment-detail-drawer';
import { fetchDayAppointments } from '@/lib/appointments';

const TYPE_LABELS: Record<AppointmentResponse['type'], string> = {
  CONSULTA: 'Consulta',
  RETORNO: 'Retorno',
  AVALIACAO: 'Avaliação',
  PROCEDIMENTO: 'Procedimento',
};

function todayIsoBRT(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

function SkeletonRow() {
  return <div className="h-20 bg-white rounded-xl border border-[#e2e8f0] animate-pulse" />;
}

export default function ConsultasPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('id');
  const date = todayIsoBRT();

  const { data: appointments, status } = useQuery<AppointmentResponse[]>({
    queryKey: ['appointments-day', date],
    queryFn: () => fetchDayAppointments(date),
    staleTime: 2 * 60 * 1000,
  });

  const openDrawer = useCallback(
    (id: string) => {
      router.replace(`/consultas?id=${id}`, { scroll: false });
    },
    [router],
  );

  const closeDrawer = useCallback(() => {
    router.replace('/consultas', { scroll: false });
  }, [router]);

  const list = appointments ?? [];

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-[24px] font-semibold tracking-tight text-[#0f172a] mb-6">
        Consultas de Hoje
      </h1>

      {status === 'pending' && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      )}

      {status === 'error' && (
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-8 text-center">
          <span className="material-symbols-outlined text-[40px] text-red-400 mb-3 block">
            error
          </span>
          <p className="text-[14px] text-[#64748b]">Erro ao carregar consultas.</p>
        </div>
      )}

      {status === 'success' && list.length === 0 && (
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-12 text-center">
          <span className="material-symbols-outlined text-[48px] text-[#94a3b8] mb-3 block">
            event_available
          </span>
          <p className="text-[16px] text-[#64748b]">Nenhuma consulta agendada para hoje.</p>
        </div>
      )}

      {status === 'success' && list.length > 0 && (
        <div className="space-y-3">
          {list.map((appt) => (
            <button
              key={appt.id}
              type="button"
              onClick={() => openDrawer(appt.id)}
              className="block w-full text-left bg-white rounded-xl border border-[#e2e8f0] p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="text-right shrink-0 min-w-[52px]">
                    <p className="text-[16px] font-semibold text-[#0f172a]">
                      {format(new Date(appt.startsAt), 'HH:mm')}
                    </p>
                    <p className="text-[11px] text-[#94a3b8]">{appt.durationMinutes} min</p>
                  </div>
                  <div className="w-px h-10 bg-[#e2e8f0] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[15px] font-medium text-[#0f172a] truncate">
                      {appt.patient.fullName}
                    </p>
                    <p className="text-[13px] text-[#64748b]">
                      {TYPE_LABELS[appt.type]}
                      {appt.insurance ? ` • ${appt.insurance}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={appt.status} />
                  <span className="material-symbols-outlined text-[#94a3b8] text-[20px]">
                    chevron_right
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <AppointmentDetailDrawer appointmentId={selectedId} onClose={closeDrawer} />
    </div>
  );
}
