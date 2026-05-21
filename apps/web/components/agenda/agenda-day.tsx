'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchDayAppointments } from '@/lib/appointments';
import { groupByPeriod } from '@/lib/group-by-period';
import { AgendaSection } from './agenda-section';
import type { AppointmentResponse } from '@medschedule/shared';

interface AgendaDayProps {
  isoDate: string;
  onCancelAppointment: (appt: AppointmentResponse) => void;
}

function SkeletonCard() {
  return <div className="h-20 bg-[#f1f5f9] rounded-lg animate-pulse" />;
}

export function AgendaDay({ isoDate, onCancelAppointment }: AgendaDayProps) {
  const { data: appointments, status } = useQuery<AppointmentResponse[]>({
    queryKey: ['appointments-day', isoDate],
    queryFn: () => fetchDayAppointments(isoDate),
    staleTime: 2 * 60 * 1000,
  });

  if (status === 'pending') {
    return (
      <div className="grid xl:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-[#cbd5e1] flex flex-col min-h-[400px] p-3 gap-2"
          >
            {Array.from({ length: 3 }).map((__, j) => (
              <SkeletonCard key={j} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="material-symbols-outlined text-3xl text-red-400">error</span>
          <p className="text-sm text-[#64748b]">Erro ao carregar agendamentos.</p>
        </div>
      </div>
    );
  }

  const { manha, tarde, noite } = groupByPeriod(appointments ?? []);

  return (
    <div className="grid xl:grid-cols-3 gap-4">
      <AgendaSection
        title="Manhã"
        icon="light_mode"
        iconColor="text-[#4648d4]"
        appointments={manha}
        onCancelAppointment={onCancelAppointment}
      />
      <AgendaSection
        title="Tarde"
        icon="routine"
        iconColor="text-[#b55d00]"
        appointments={tarde}
        onCancelAppointment={onCancelAppointment}
      />
      <AgendaSection
        title="Noite"
        icon="dark_mode"
        iconColor="text-[#3323cc]"
        appointments={noite}
        onCancelAppointment={onCancelAppointment}
      />
    </div>
  );
}
