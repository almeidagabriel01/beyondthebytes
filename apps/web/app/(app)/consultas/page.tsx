import Link from 'next/link';
import { cookies } from 'next/headers';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { AppointmentResponse } from '@medschedule/shared';
import { StatusBadge } from '@/components/shared/status-badge';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

async function fetchTodayAppointments(cookieHeader: string): Promise<AppointmentResponse[]> {
  const date = format(new Date(), 'yyyy-MM-dd');
  const res = await fetch(`${API}/appointments?date=${date}`, {
    headers: { Cookie: cookieHeader },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  return res.json() as Promise<AppointmentResponse[]>;
}

const TYPE_LABELS: Record<AppointmentResponse['type'], string> = {
  CONSULTA: 'Consulta',
  RETORNO: 'Retorno',
  AVALIACAO: 'Avaliação',
  PROCEDIMENTO: 'Procedimento',
};

export default async function ConsultasPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  const appointments = await fetchTodayAppointments(cookieHeader);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-[24px] font-semibold tracking-tight text-[#0f172a] mb-6">
        Consultas de Hoje
      </h1>

      {appointments.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-12 text-center">
          <span className="material-symbols-outlined text-[48px] text-[#94a3b8] mb-3 block">
            event_available
          </span>
          <p className="text-[16px] text-[#64748b]">Nenhuma consulta agendada para hoje.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((appt) => (
            <Link
              key={appt.id}
              href={`/consultas/${appt.id}`}
              className="block bg-white rounded-xl border border-[#e2e8f0] p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="text-right shrink-0 min-w-[52px]">
                    <p className="text-[16px] font-semibold text-[#0f172a]">
                      {format(new Date(appt.startsAt), 'HH:mm')}
                    </p>
                    <p className="text-[11px] text-[#94a3b8]">{appt.durationMinutes} min</p>
                  </div>
                  <div className="w-px h-10 bg-[#e2e8f0] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[15px] font-medium text-[#0f172a] truncate">
                      {appt.patient.fullName}
                    </p>
                    <p className="text-[13px] text-[#64748b]">
                      {TYPE_LABELS[appt.type]}
                      {appt.insurance ? ` • ${appt.insurance}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={appt.status} />
                  <span className="material-symbols-outlined text-[#94a3b8] text-[20px]">
                    chevron_right
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
