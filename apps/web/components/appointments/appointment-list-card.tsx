'use client';

import type { AppointmentResponse } from '@medschedule/shared';
import { formatSlotTime } from '@medschedule/shared';
import { StatusBadge } from '@/components/shared/status-badge';
import { cn } from '@/lib/utils';

const TYPE_LABELS: Record<AppointmentResponse['type'], string> = {
  CONSULTA: 'Consulta',
  RETORNO: 'Retorno',
  AVALIACAO: 'Avaliação',
  PROCEDIMENTO: 'Procedimento',
};

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

interface Props {
  appointment: AppointmentResponse;
  selected: boolean;
  anySelected: boolean;
  onClick: () => void;
}

export function AppointmentListCard({ appointment: a, selected, anySelected, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative w-full text-left rounded-xl p-4 flex items-center justify-between gap-4 transition-all',
        selected
          ? 'bg-white border-2 border-[#4648d4] shadow-sm overflow-hidden'
          : 'bg-white border border-[#e2e8f0] hover:shadow-sm',
        anySelected && !selected && 'opacity-50 hover:opacity-100',
      )}
    >
      {selected && (
        <span aria-hidden="true" className="absolute left-0 top-0 bottom-0 w-1 bg-[#4648d4]" />
      )}
      <div className={cn('flex items-center gap-4 min-w-0', selected && 'pl-2')}>
        <div className="w-12 h-12 rounded-full bg-[#e1e0ff] text-[#4648d4] flex items-center justify-center text-[15px] font-bold shrink-0">
          {initials(a.patient.fullName)}
        </div>
        <div className="min-w-0">
          <h4 className="text-[15px] font-semibold text-[#0f172a] truncate">
            {a.patient.fullName}
          </h4>
          <p className="text-[13px] text-[#475569] truncate">
            {TYPE_LABELS[a.type]}
            {a.insurance ? ` • ${a.insurance}` : ''}
          </p>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p
          className={cn(
            'text-[14px] font-bold tabular-nums',
            selected ? 'text-[#4648d4]' : 'text-[#0f172a]',
          )}
        >
          {formatSlotTime(new Date(a.startsAt))}
        </p>
        <StatusBadge status={a.status} className="mt-1 text-[11px] px-2.5 py-0.5" />
      </div>
    </button>
  );
}
