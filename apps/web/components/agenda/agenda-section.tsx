import Link from 'next/link';
import { AppointmentCard } from '@/components/appointments/appointment-card';
import { QuickActionsMenu } from '@/components/appointments/quick-actions-menu';
import type { AppointmentResponse } from '@medschedule/shared';

interface AgendaSectionProps {
  title: string;
  icon: string;
  iconColor: string;
  appointments: AppointmentResponse[];
  isoDate: string;
  onCancelAppointment: (appt: AppointmentResponse) => void;
}

export function AgendaSection({
  title,
  icon,
  iconColor,
  appointments,
  isoDate,
  onCancelAppointment,
}: AgendaSectionProps) {
  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-[0_4px_12px_rgba(15,23,42,0.02)] flex flex-col h-full min-h-[400px]">
      {/* Header */}
      <div className="p-4 border-b border-[#e2e8f0] bg-[#f8fafc]/50 flex justify-between items-center shrink-0">
        <div className={`flex items-center gap-2 ${iconColor}`}>
          <span className="material-symbols-outlined text-xl leading-none" aria-hidden="true">
            {icon}
          </span>
          <h3 className="text-[18px] font-semibold leading-6">{title}</h3>
        </div>
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#e2e8f0] text-[12px] text-[#464554]">
          {appointments.length} consultas
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 py-10 text-center">
            <span className="material-symbols-outlined text-3xl text-[#cbd5e1] mb-2">
              calendar_today
            </span>
            <p className="text-sm text-[#94a3b8]">Nenhum agendamento</p>
          </div>
        ) : (
          appointments.map((appt) => (
            <Link key={appt.id} href={`/consultas?id=${appt.id}`} className="block">
              <AppointmentCard
                appointment={appt}
                variant="agenda"
                rightSlot={
                  <QuickActionsMenu
                    appointment={appt}
                    queryKey={['appointments-day', isoDate]}
                    onCancelRequest={onCancelAppointment}
                  />
                }
              />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
