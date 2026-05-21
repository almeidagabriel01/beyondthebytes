'use client';

import { formatSlotTime } from '@medschedule/shared';
import type { AppointmentResponse } from '@medschedule/shared';
import { StatusBadge } from '@/components/shared/status-badge';
import { isVencido } from '@/lib/appointment-status';

const TYPE_LABELS: Record<AppointmentResponse['type'], string> = {
  CONSULTA: 'Consulta',
  RETORNO: 'Retorno',
  AVALIACAO: 'Avaliação',
  PROCEDIMENTO: 'Procedimento',
};

interface AppointmentCardProps {
  appointment: AppointmentResponse;
  variant?: 'agenda' | 'calendar';
  onClick?: (() => void) | undefined;
}

function VencidoPill() {
  return (
    <span className="inline-flex items-center bg-[#ffdcc5] text-[#703700] text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold shrink-0">
      Vencido
    </span>
  );
}

export function AppointmentCard({
  appointment: appt,
  variant = 'agenda',
  onClick,
}: AppointmentCardProps) {
  const vencido = isVencido(appt);

  const isCancelled = appt.status === 'CANCELADO';
  const isRealizado = appt.status === 'REALIZADO';
  const isEmAtendimento = appt.status === 'EM_ATENDIMENTO';

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

  // ── Calendar variant ────────────────────────────────────────────────────────
  if (variant === 'calendar') {
    let outerClass =
      'relative bg-white border rounded-lg p-3 flex gap-4 transition-shadow overflow-hidden';

    if (isCancelled) {
      outerClass += ' border-dashed border-[#e2e8f0] opacity-60 cursor-not-allowed';
    } else if (isRealizado) {
      outerClass += ' border-[#e2e8f0] opacity-70 hover:shadow-md cursor-pointer';
    } else if (isEmAtendimento) {
      outerClass +=
        ' border-2 border-[#4648d4] shadow-[0_4px_12px_rgba(15,23,42,0.05)] cursor-pointer';
    } else if (vencido) {
      outerClass += ' border-[#e2e8f0] hover:shadow-md cursor-pointer';
    } else {
      outerClass += ' border-[#e2e8f0] hover:shadow-md cursor-pointer';
    }

    const separatorBorder = isEmAtendimento ? 'border-[#4648d4]' : 'border-[#cbd5e1]';

    const timeColor = isEmAtendimento
      ? 'text-[#4648d4]'
      : isRealizado
        ? 'text-[#475569]'
        : isCancelled
          ? 'text-[#94a3b8]'
          : 'text-[#0f172a]';

    return (
      <div className={outerClass} {...interactiveProps}>
        {isEmAtendimento && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#4648d4]" aria-hidden="true" />
        )}
        {vencido && !isEmAtendimento && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#b55d00]" aria-hidden="true" />
        )}
        <div
          className={`flex flex-col items-center justify-center min-w-[50px] border-r ${separatorBorder} pr-3 shrink-0 ${isEmAtendimento || vencido ? 'pl-1' : ''}`}
        >
          <span className={`text-[18px] font-semibold leading-tight ${timeColor}`}>
            {formatSlotTime(new Date(appt.startsAt))}
          </span>
          {!isCancelled && (
            <span className="text-[11px] text-[#94a3b8] mt-0.5">{appt.durationMinutes} min</span>
          )}
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <span
              className={`text-[14px] font-semibold truncate ${isCancelled ? 'text-[#94a3b8] line-through' : 'text-[#0f172a]'}`}
            >
              {appt.patient.fullName}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {vencido && <VencidoPill />}
              <StatusBadge status={appt.status} />
            </div>
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

  // ── Agenda variant ──────────────────────────────────────────────────────────
  let outerClass = 'relative bg-white rounded-lg p-4 flex gap-4 transition-shadow overflow-hidden';

  if (isCancelled) {
    outerClass += ' border border-dashed border-[#e2e8f0] opacity-60 cursor-not-allowed';
  } else if (isRealizado) {
    outerClass +=
      ' border border-[#e2e8f0] opacity-70 hover:shadow-[0_4px_12px_rgba(15,23,42,0.05)] cursor-pointer';
  } else if (isEmAtendimento) {
    outerClass +=
      ' border-2 border-[#4648d4] shadow-[0_4px_12px_rgba(15,23,42,0.05)] cursor-pointer';
  } else {
    outerClass +=
      ' border border-[#e2e8f0] hover:shadow-[0_4px_12px_rgba(15,23,42,0.05)] cursor-pointer';
  }

  // Time column color
  const timeColClass = isEmAtendimento
    ? 'text-[#4648d4]'
    : isRealizado
      ? 'text-[#475569]'
      : isCancelled
        ? 'text-[#94a3b8]'
        : 'text-[#0f172a]';

  // Time font weight — EM_ATENDIMENTO is bold
  const timeFontClass = isEmAtendimento ? 'font-bold' : 'font-semibold';

  // Divider color
  const dividerColor = isEmAtendimento
    ? 'bg-[#4648d4]/20'
    : isRealizado || isCancelled
      ? 'bg-[#cbd5e1]'
      : 'bg-[#e2e8f0]';

  // Name color + strikethrough for cancelled
  const nameClass = isCancelled ? 'text-[#94a3b8] line-through' : 'text-[#0f172a]';

  // Type+insurance combined label
  const typeInsuranceText = appt.insurance
    ? `${TYPE_LABELS[appt.type]} • ${appt.insurance}`
    : TYPE_LABELS[appt.type];

  const typeInsuranceColor = isCancelled ? 'text-[#94a3b8]' : 'text-[#475569]';

  return (
    <div className={outerClass} {...interactiveProps}>
      {isEmAtendimento && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#4648d4]" aria-hidden="true" />
      )}
      {vencido && !isEmAtendimento && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#b55d00]" aria-hidden="true" />
      )}
      {/* Time column */}
      <div
        className={`min-w-[60px] flex flex-col items-end justify-center text-right shrink-0 ${timeColClass} ${vencido && !isEmAtendimento ? 'pl-1' : ''}`}
      >
        <span className={`text-[14px] ${timeFontClass}`}>
          {formatSlotTime(new Date(appt.startsAt))}
        </span>
        {!isCancelled && (
          <span className="text-[11px] mt-0.5 text-[#94a3b8]">{appt.durationMinutes} min</span>
        )}
      </div>
      {/* Vertical divider */}
      <div className={`w-1 rounded-full self-stretch ${dividerColor}`} aria-hidden="true" />
      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className={`text-[16px] font-medium truncate ${nameClass}`}>
            {appt.patient.fullName}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {vencido && <VencidoPill />}
            <StatusBadge status={appt.status} />
          </div>
        </div>
        <span className={`text-[13px] ${typeInsuranceColor}`}>{typeInsuranceText}</span>
      </div>
    </div>
  );
}
