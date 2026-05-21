import type { AppointmentStatus } from '@medschedule/shared';
import { StatusBadge } from '@/components/shared/status-badge';

interface Props {
  byStatus: Record<AppointmentStatus, number>;
}

const ORDER: AppointmentStatus[] = [
  'AGENDADO',
  'CONFIRMADO',
  'AGUARDANDO',
  'EM_ATENDIMENTO',
  'REALIZADO',
  'CANCELADO',
];

export function StatusDayPanel({ byStatus }: Props) {
  return (
    <section className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm">
      <header className="px-5 py-4 border-b border-[#e2e8f0]">
        <h2 className="text-[16px] font-semibold text-[#0f172a] flex items-center gap-2">
          <span className="material-symbols-outlined text-[#4648d4] text-[20px]" aria-hidden="true">
            insights
          </span>
          Status do dia
        </h2>
      </header>
      <ul className="px-5 py-4 space-y-3">
        {ORDER.map((status) => (
          <li key={status} className="flex items-center justify-between gap-3">
            <StatusBadge status={status} className="text-[11px] px-2.5 py-1" />
            <span className="text-[14px] font-semibold tabular-nums text-[#0f172a]">
              {byStatus[status] ?? 0}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
