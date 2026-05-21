import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { AppointmentEventResponse } from '@medschedule/shared';

const ACTION_CONFIG: Record<string, { label: string; icon: string }> = {
  CREATED: { label: 'Consulta agendada', icon: 'event_available' },
  UPDATED: { label: 'Agendamento editado', icon: 'edit' },
  CANCELLED: { label: 'Consulta cancelada', icon: 'event_busy' },
  TRANSITIONED: { label: 'Status alterado', icon: 'swap_horiz' },
};

const STATUS_LABELS: Record<string, string> = {
  AGENDADO: 'Agendado',
  CONFIRMADO: 'Confirmado',
  AGUARDANDO: 'Aguardando',
  EM_ATENDIMENTO: 'Em atendimento',
  REALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
};

function formatEventTime(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return `Hoje, ${format(d, 'HH:mm')}`;
  if (isYesterday(d)) return `Ontem, ${format(d, 'HH:mm')}`;
  return format(d, "d MMM', 'HH:mm", { locale: ptBR });
}

function eventLabel(event: AppointmentEventResponse): string {
  if (event.action === 'TRANSITIONED' && event.fromStatus && event.toStatus) {
    const from = STATUS_LABELS[event.fromStatus] ?? event.fromStatus;
    const to = STATUS_LABELS[event.toStatus] ?? event.toStatus;
    return `Status alterado de "${from}" para "${to}"`;
  }
  return ACTION_CONFIG[event.action]?.label ?? event.action;
}

interface StatusTimelineProps {
  events: AppointmentEventResponse[];
}

export function StatusTimeline({ events }: StatusTimelineProps) {
  if (events.length === 0) {
    return <p className="text-[13px] text-[#94a3b8] py-2">Nenhum evento registrado.</p>;
  }

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:inset-y-0 before:left-[11px] before:w-px before:bg-[#e2e8f0]">
      {events.map((event, idx) => {
        const config = ACTION_CONFIG[event.action] ?? { label: event.action, icon: 'info' };
        const isLatest = idx === events.length - 1;
        return (
          <div key={event.id} className="relative">
            <div
              className={`absolute -left-[28px] rounded-full ${isLatest ? 'bg-slate-100 p-1' : ''}`}
            >
              {isLatest ? (
                <div className="w-2.5 h-2.5 bg-[#4648d4] rounded-full ring-4 ring-[#4648d4]/20" />
              ) : (
                <span className="material-symbols-outlined text-[16px] text-[#64748b] bg-white border border-[#e2e8f0] rounded-full p-0.5">
                  {config.icon}
                </span>
              )}
            </div>
            <div className="flex justify-between items-start gap-4">
              <div>
                <p className="text-[14px] font-medium text-[#0f172a]">{eventLabel(event)}</p>
                <p className="text-[13px] text-[#64748b] mt-0.5">Por {event.byUserName}</p>
              </div>
              <span className="text-[11px] text-[#94a3b8] whitespace-nowrap shrink-0">
                {formatEventTime(event.createdAt)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
