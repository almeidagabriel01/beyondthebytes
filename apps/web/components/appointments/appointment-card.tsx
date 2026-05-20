'use client';

import { formatSlotTime } from '@medschedule/shared';
import type { AppointmentResponse } from '@medschedule/shared';
import { StatusBadge } from '@/components/shared/status-badge';

const TYPE_LABELS: Record<AppointmentResponse['type'], string> = {
  CONSULTA: 'Consulta',
  RETORNO: 'Retorno',
  AVALIACAO: 'Avaliação',
  PROCEDIMENTO: 'Procedimento',
};

const LATE_ELIGIBLE_STATUSES = new Set<AppointmentResponse['status']>([
  'AGENDADO',
  'CONFIRMADO',
  'AGUARDANDO',
]);

interface AppointmentCardProps {
  appointment: AppointmentResponse;
  onClick?: (() => void) | undefined;
}

export function AppointmentCard({ appointment: appt, onClick }: AppointmentCardProps) {
  const now = new Date();
  const startsAt = new Date(appt.startsAt);
  const isLate = startsAt < now && LATE_ELIGIBLE_STATUSES.has(appt.status);

  // Determine visual state (priority: CANCELADO > REALIZADO > EM_ATENDIMENTO > atrasado > normal)
  const isCancelled = appt.status === 'CANCELADO';
  const isRealizado = appt.status === 'REALIZADO';
  const isEmAtendimento = appt.status === 'EM_ATENDIMENTO';

  let outerClass =
    'relative flex gap-4 rounded-lg p-4 transition-shadow hover:shadow-[0_4px_12px_rgba(15,23,42,0.05)]';
  let dividerClass = 'w-px rounded-full self-stretch';

  if (isCancelled) {
    outerClass += ' bg-white border border-dashed border-[#e2e8f0] opacity-60 cursor-not-allowed';
    dividerClass += ' bg-[#e2e8f0]';
  } else if (isRealizado) {
    outerClass += ' bg-white border border-[#e2e8f0] opacity-70';
    dividerClass += ' bg-[#e2e8f0]';
  } else if (isEmAtendimento) {
    outerClass += ' bg-white border-2 border-[#4648d4] overflow-hidden';
    dividerClass += ' bg-[#4648d4]';
  } else if (isLate) {
    outerClass += ' bg-red-50 border border-red-200';
    dividerClass += ' bg-red-300';
  } else {
    outerClass += ' bg-white border border-[#e2e8f0]';
    dividerClass += ' bg-[#e2e8f0]';
  }

  return (
    <div
      className={outerClass}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick && !isCancelled ? 0 : undefined}
      onClick={!isCancelled ? onClick : undefined}
      onKeyDown={
        onClick && !isCancelled
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') onClick();
            }
          : undefined
      }
    >
      {/* Left accent bar for EM_ATENDIMENTO */}
      {isEmAtendimento && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#4648d4]" aria-hidden="true" />
      )}

      {/* Time column */}
      <div className="min-w-[60px] flex flex-col items-center justify-center text-center shrink-0">
        <span className="text-sm font-semibold text-[#0f172a]">{formatSlotTime(startsAt)}</span>
        <span className="text-[11px] text-[#94a3b8] mt-0.5">{appt.durationMinutes} min</span>
      </div>

      {/* Vertical divider */}
      <div className={dividerClass} aria-hidden="true" />

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-[#0f172a] truncate">
            {appt.patient.fullName}
          </span>
          <StatusBadge status={appt.status} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-[#64748b]">{TYPE_LABELS[appt.type]}</span>
          {appt.insurance && (
            <>
              <span className="text-[#cbd5e1] text-[11px]">·</span>
              <span className="text-[11px] text-[#94a3b8]">{appt.insurance}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
