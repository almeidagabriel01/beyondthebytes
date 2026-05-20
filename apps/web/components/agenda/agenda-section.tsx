import { AppointmentCard } from '@/components/appointments/appointment-card';
import type { AppointmentResponse } from '@medschedule/shared';

interface AgendaSectionProps {
  title: string;
  icon: string;
  iconColor: string;
  appointments: AppointmentResponse[];
  onCancelAppointment: (appt: AppointmentResponse) => void;
}

export function AgendaSection({
  title,
  icon,
  iconColor,
  appointments,
  onCancelAppointment,
}: AgendaSectionProps) {
  return (
    <div className="bg-white rounded-xl border border-[#cbd5e1] flex flex-col h-full min-h-[400px]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#cbd5e1] flex items-center gap-2 shrink-0">
        <span
          className={`material-symbols-outlined text-xl leading-none ${iconColor}`}
          aria-hidden="true"
        >
          {icon}
        </span>
        <h3 className="text-sm font-semibold text-[#1b1b23]">{title}</h3>
        <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#f1f5f9] text-[11px] font-semibold text-[#475569]">
          {appointments.length}
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
            <AppointmentCard
              key={appt.id}
              appointment={appt}
              {...(appt.status !== 'CANCELADO' && appt.status !== 'REALIZADO'
                ? { onClick: () => onCancelAppointment(appt) }
                : {})}
            />
          ))
        )}
      </div>
    </div>
  );
}
