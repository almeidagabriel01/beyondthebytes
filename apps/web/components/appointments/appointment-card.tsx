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
  variant?: 'agenda' | 'calendar';
  onClick?: (() => void) | undefined;
}

export function AppointmentCard({
  appointment: appt,
  variant = 'agenda',
  onClick,
}: AppointmentCardProps) {
  const now = new Date();
  const startsAt = new Date(appt.startsAt);
  const isLate = startsAt < now && LATE_ELIGIBLE_STATUSES.has(appt.status);

  const isCancelled = appt.status === 'CANCELADO';
  const isRealizado = appt.status === 'REALIZADO';
  const isEmAtendimento = appt.status === 'EM_ATENDIMENTO';

  let outerClass = 'relative flex rounded-lg transition-shadow';
  if (variant === 'agenda') {
    outerClass += ' gap-4 p-4 hover:shadow-[0_4px_12px_rgba(15,23,42,0.05)]';
  } else {
    outerClass += ' gap-3 p-3';
  }

  if (isCancelled) {
    outerClass += ' bg-white border border-dashed border-[#e2e8f0] opacity-60 cursor-not-allowed';
  } else if (isRealizado) {
    outerClass += ' bg-white border border-[#e2e8f0] opacity-70';
  } else if (isEmAtendimento) {
    outerClass += ' bg-white border-2 border-[#4648d4] overflow-hidden';
  } else if (isLate) {
    outerClass += ' bg-red-50 border border-red-200';
  } else {
    outerClass += ' bg-white border border-[#e2e8f0]';
  }

  const interactiveProps =
    onClick && !isCancelled
      ? {
          role: 'button' as const,
          tabIndex: 0,
          onClick,
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') onClick();
          },
        }
      : {};

  if (variant === 'calendar') {
    const separatorColor = isEmAtendimento
      ? 'border-[#4648d4]'
      : isLate
        ? 'border-red-300'
        : 'border-[#cbd5e1]';

    return (
      <div className={outerClass} {...interactiveProps}>
        {isEmAtendimento && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#4648d4]" aria-hidden="true" />
        )}
        <div
          className={`flex flex-col items-center justify-center min-w-[50px] border-r ${separatorColor} pr-3 shrink-0`}
        >
          <span className="text-[18px] font-semibold text-[#0f172a] leading-tight">
            {formatSlotTime(startsAt)}
          </span>
          <span className="text-[11px] text-[#94a3b8] mt-0.5">{appt.durationMinutes} min</span>
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="flex items-start gap-2 flex-wrap">
            <span className="text-[14px] font-semibold text-[#0f172a] truncate">
              {appt.patient.fullName}
            </span>
            <StatusBadge status={appt.status} />
          </div>
          <span className="text-[12px] text-[#64748b]">{TYPE_LABELS[appt.type]}</span>
          {appt.insurance && (
            <span className="inline-flex self-start bg-[#e2e8f0] px-2 py-1 rounded text-[11px] text-[#475569]">
              {appt.insurance}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Agenda variant
  const dividerColor = isEmAtendimento ? 'bg-[#4648d4]' : isLate ? 'bg-red-300' : 'bg-[#e2e8f0]';

  return (
    <div className={outerClass} {...interactiveProps}>
      {isEmAtendimento && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#4648d4]" aria-hidden="true" />
      )}
      <div className="min-w-[60px] flex flex-col items-end justify-center text-right shrink-0">
        <span className="text-[14px] font-semibold text-[#0f172a]">{formatSlotTime(startsAt)}</span>
        <span className="text-[11px] text-[#94a3b8] mt-0.5">{appt.durationMinutes} min</span>
      </div>
      <div className={`w-1 rounded-full self-stretch ${dividerColor}`} aria-hidden="true" />
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[16px] font-medium text-[#0f172a] truncate">
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
