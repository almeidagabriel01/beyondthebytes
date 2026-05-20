import type { AppointmentStatus } from '@medschedule/shared';

interface StatusBadgeProps {
  status: AppointmentStatus;
  className?: string;
}

const CONFIG: Record<
  AppointmentStatus,
  { label: string; colorClass: string; pulse?: boolean; checkIcon?: boolean }
> = {
  AGENDADO: { label: 'Agendado', colorClass: 'bg-[#ffdcc5] text-[#703700]' },
  CONFIRMADO: { label: 'Confirmado', colorClass: 'bg-[#e1e0ff] text-[#2f2ebe]' },
  AGUARDANDO: { label: 'Aguardando', colorClass: 'bg-[#e2e8f0] text-[#475569]' },
  EM_ATENDIMENTO: {
    label: 'Em atendimento',
    colorClass: 'bg-[#4648d4]/10 text-[#4648d4]',
    pulse: true,
  },
  REALIZADO: {
    label: 'Finalizado',
    colorClass: 'bg-[#f1f5f9] text-[#64748b]',
    checkIcon: true,
  },
  CANCELADO: { label: 'Cancelado', colorClass: 'bg-[#cbd5e1] text-[#64748b]' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { label, colorClass, pulse, checkIcon } = CONFIG[status];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium leading-4 ${colorClass}${className ? ` ${className}` : ''}`}
    >
      {pulse && (
        <span className="w-2 h-2 bg-[#4648d4] rounded-full animate-pulse" aria-hidden="true" />
      )}
      {checkIcon && (
        <span className="material-symbols-outlined text-[14px] leading-none" aria-hidden="true">
          check_circle
        </span>
      )}
      {label}
    </span>
  );
}
