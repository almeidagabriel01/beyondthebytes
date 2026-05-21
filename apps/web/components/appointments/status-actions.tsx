'use client';

import type { AppointmentStatus } from '@medschedule/shared';
import { canTransition, isTerminal } from '@medschedule/shared';

interface StatusAction {
  to: AppointmentStatus;
  label: string;
  icon: string;
  variant: 'primary' | 'secondary' | 'danger';
}

const ACTIONS: StatusAction[] = [
  { to: 'CONFIRMADO', label: 'Confirmar', icon: 'check', variant: 'secondary' },
  {
    to: 'AGUARDANDO',
    label: 'Marcar como Aguardando',
    icon: 'hourglass_empty',
    variant: 'secondary',
  },
  { to: 'EM_ATENDIMENTO', label: 'Iniciar Atendimento', icon: 'play_arrow', variant: 'secondary' },
  { to: 'REALIZADO', label: 'Marcar como Realizado', icon: 'check_circle', variant: 'primary' },
  { to: 'CANCELADO', label: 'Cancelar Consulta', icon: 'event_busy', variant: 'danger' },
];

interface StatusActionsProps {
  currentStatus: AppointmentStatus;
  onTransition: (to: AppointmentStatus) => void;
  onEdit: () => void;
  loading?: boolean;
}

export function StatusActions({
  currentStatus,
  onTransition,
  onEdit,
  loading,
}: StatusActionsProps) {
  const availableActions = ACTIONS.filter((a) => canTransition(currentStatus, a.to));
  const isTerminalStatus = isTerminal(currentStatus);

  return (
    <div className="flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={onEdit}
        disabled={isTerminalStatus || loading}
        className="px-4 py-2 text-[#64748b] border border-[#e2e8f0] rounded-lg text-[12px] font-semibold hover:bg-[#f8fafc] transition-colors bg-white disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Editar Detalhes
      </button>

      <div className="flex items-center gap-2">
        {availableActions.map((action) => (
          <button
            key={action.to}
            type="button"
            onClick={() => onTransition(action.to)}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-[12px] font-semibold flex items-center gap-1.5 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed ${
              action.variant === 'primary'
                ? 'bg-[#4648d4] text-white shadow-sm hover:opacity-90'
                : action.variant === 'danger'
                  ? 'text-[#ba1a1a] border border-[#ba1a1a]/30 hover:bg-[#ffdad6] bg-white'
                  : 'text-[#4648d4] bg-[#e2dfff] hover:bg-[#c3c0ff]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px] leading-none">
              {action.icon}
            </span>
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
