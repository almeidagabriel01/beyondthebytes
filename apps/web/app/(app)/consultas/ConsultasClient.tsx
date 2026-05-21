'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { AppointmentResponse } from '@medschedule/shared';
import { AppointmentDetailDrawer } from '@/components/appointments/appointment-detail-drawer';
import { AppointmentListCard } from '@/components/appointments/appointment-list-card';
import { fetchDayAppointments } from '@/lib/appointments';

function todayIsoBRT(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

function SkeletonRow() {
  return <div className="h-20 bg-white rounded-xl border border-[#e2e8f0] animate-pulse" />;
}

interface Props {
  selectedId: string | null;
}

export function ConsultasClient({ selectedId }: Props) {
  const router = useRouter();
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
            <AppointmentListCard
              key={appt.id}
              appointment={appt}
              selected={appt.id === selectedId}
              anySelected={selectedId !== null}
              onClick={() => openDrawer(appt.id)}
            />
          ))}
        </div>
      )}

      <AppointmentDetailDrawer appointmentId={selectedId} onClose={closeDrawer} />
    </div>
  );
}
