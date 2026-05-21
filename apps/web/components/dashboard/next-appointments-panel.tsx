import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { NextAppointment } from '@medschedule/shared';
import { StatusBadge } from '@/components/shared/status-badge';

interface Props {
  items: NextAppointment[];
}

export function NextAppointmentsPanel({ items }: Props) {
  return (
    <section className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm">
      <header className="px-5 py-4 border-b border-[#e2e8f0] flex items-center justify-between">
        <h2 className="text-[16px] font-semibold text-[#0f172a] flex items-center gap-2">
          <span className="material-symbols-outlined text-[#4648d4] text-[20px]" aria-hidden="true">
            event_upcoming
          </span>
          Próximos atendimentos
        </h2>
        <Link href="/agenda" className="text-[12px] font-medium text-[#4648d4] hover:underline">
          Ver agenda
        </Link>
      </header>
      {items.length === 0 ? (
        <p className="px-5 py-8 text-center text-[13px] text-[#64748b]">
          Nenhum atendimento próximo no restante do dia.
        </p>
      ) : (
        <ul className="divide-y divide-[#e2e8f0]">
          {items.map((appt) => (
            <li key={appt.id}>
              <Link
                href={`/consultas/${appt.id}`}
                className="flex items-center gap-4 px-5 py-3 hover:bg-[#f8fafc] transition-colors"
              >
                <span className="text-[13px] font-semibold tabular-nums text-[#0f172a] w-14">
                  {format(new Date(appt.startsAt), 'HH:mm', { locale: ptBR })}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[14px] font-medium text-[#0f172a] truncate">
                    {appt.patient.fullName}
                  </span>
                  <span className="block text-[12px] text-[#64748b]">{appt.type}</span>
                </span>
                <StatusBadge status={appt.status} className="text-[11px] px-2.5 py-1" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
