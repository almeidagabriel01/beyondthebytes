'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import type { AppointmentResponse } from '@medschedule/shared';
import { AppointmentListCard } from '@/components/appointments/appointment-list-card';
import { AppointmentDetailDrawer } from '@/components/appointments/appointment-detail-drawer';
import { fetchHistoryAppointments } from '@/lib/appointments';

interface Props {
  selectedId: string | null;
}

function SkeletonRow() {
  return <div className="h-20 bg-white rounded-xl border border-[#e2e8f0] animate-pulse" />;
}

export function HistoricoClient({ selectedId }: Props) {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const [from, setFrom] = useState(() => format(subDays(today, 30), 'yyyy-MM-dd'));
  const [to, setTo] = useState(() => format(today, 'yyyy-MM-dd'));

  const { data, status } = useQuery<AppointmentResponse[]>({
    queryKey: ['history', from, to],
    queryFn: () => fetchHistoryAppointments(from, to, ['REALIZADO', 'CANCELADO']),
    staleTime: 60_000,
  });

  const openDrawer = useCallback(
    (id: string) => {
      router.replace(`/historico?id=${id}`, { scroll: false });
    },
    [router],
  );

  const closeDrawer = useCallback(() => {
    router.replace('/historico', { scroll: false });
  }, [router]);

  const items = data ?? [];

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <header className="mb-6">
        <h1 className="text-[24px] font-semibold tracking-tight text-[#0f172a]">Histórico</h1>
        <p className="mt-1 text-[13px] text-[#64748b]">
          Consultas realizadas e canceladas no período selecionado.
        </p>
      </header>

      <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 mb-6 flex flex-wrap gap-4 items-end">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wide">
            De
          </span>
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className="border border-[#e2e8f0] rounded-lg px-3 py-2 text-[14px] text-[#0f172a]"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wide">
            Até
          </span>
          <input
            type="date"
            value={to}
            min={from}
            onChange={(e) => setTo(e.target.value)}
            className="border border-[#e2e8f0] rounded-lg px-3 py-2 text-[14px] text-[#0f172a]"
          />
        </label>
        <p className="text-[13px] text-[#64748b] ml-auto">
          {items.length} {items.length === 1 ? 'resultado' : 'resultados'}
          {items.length === 100 ? ' (limite atingido — reduza o período)' : ''}
        </p>
      </div>

      {status === 'pending' && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      )}

      {status === 'error' && (
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-8 text-center">
          <span className="material-symbols-outlined text-[40px] text-red-400 mb-3 block">
            error
          </span>
          <p className="text-[14px] text-[#ba1a1a]">Erro ao carregar histórico.</p>
        </div>
      )}

      {status === 'success' && items.length === 0 && (
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-12 text-center">
          <span className="material-symbols-outlined text-[48px] text-[#94a3b8] mb-3 block">
            history
          </span>
          <p className="text-[14px] text-[#64748b]">Nenhuma consulta encontrada no período.</p>
        </div>
      )}

      {status === 'success' && items.length > 0 && (
        <div className="space-y-3">
          {items.map((a) => (
            <AppointmentListCard
              key={a.id}
              appointment={a}
              selected={a.id === selectedId}
              anySelected={selectedId !== null}
              onClick={() => openDrawer(a.id)}
            />
          ))}
        </div>
      )}

      <AppointmentDetailDrawer appointmentId={selectedId} onClose={closeDrawer} />
    </div>
  );
}
