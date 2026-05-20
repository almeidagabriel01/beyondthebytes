'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cancelAppointment } from '@/lib/appointments';
import type { AppointmentResponse } from '@medschedule/shared';

const MAX_REASON = 200;
const WARN_AT = 180;

interface CancelAppointmentModalProps {
  appointment: AppointmentResponse;
  onClose: () => void;
}

export function CancelAppointmentModal({ appointment, onClose }: CancelAppointmentModalProps) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');

  // Derive the ISO date string (YYYY-MM-DD) for cache invalidation
  const isoDate = appointment.startsAt.slice(0, 10);

  const mutation = useMutation({
    mutationFn: () => cancelAppointment(appointment.id, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments-day', isoDate] });
      queryClient.invalidateQueries({ queryKey: ['month-summary'] });
      onClose();
    },
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const formattedDate = (() => {
    try {
      return format(new Date(appointment.startsAt), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR });
    } catch {
      return appointment.startsAt;
    }
  })();

  const charCount = reason.length;
  const charCountClass = charCount >= WARN_AT ? 'text-red-500 font-medium' : 'text-gray-400';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-[24px] shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 px-6 pt-8 pb-5 text-center">
          {/* Warning icon */}
          <div className="w-12 h-12 rounded-full bg-[#ffdad6]/40 ring-4 ring-[#ffdad6]/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl text-[#ba1a1a]">warning</span>
          </div>
          <h2 id="cancel-modal-title" className="text-lg font-semibold text-gray-900">
            Cancelar Consulta
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Você está prestes a cancelar a consulta de{' '}
            <span className="font-medium text-gray-700">{appointment.patient.fullName}</span>{' '}
            agendada para {formattedDate}. Esta ação não pode ser desfeita.
          </p>
        </div>

        {/* Body */}
        <div className="px-6 pb-4">
          <label htmlFor="cancel-reason" className="block text-sm font-medium text-gray-700 mb-1.5">
            Motivo do cancelamento <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <div className="relative">
            <textarea
              id="cancel-reason"
              rows={4}
              maxLength={MAX_REASON}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Informe o motivo do cancelamento..."
              className="w-full rounded-xl bg-gray-50 border border-gray-200 px-3 py-2.5 text-sm outline-none transition resize-none focus:border-red-300 focus:ring-2 focus:ring-red-200/50"
            />
            <span className={`absolute bottom-2.5 right-3 text-xs tabular-nums ${charCountClass}`}>
              {charCount}/{MAX_REASON}
            </span>
          </div>

          {mutation.isError && (
            <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 border border-red-200">
              {(mutation.error as Error).message}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 rounded-b-[24px] flex items-center justify-end gap-3 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white transition-colors"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-[#ba1a1a] px-4 py-2 text-sm font-medium text-white hover:bg-[#a01515] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {mutation.isPending && (
              <span className="material-symbols-outlined text-base animate-spin leading-none">
                progress_activity
              </span>
            )}
            Confirmar cancelamento
          </button>
        </div>
      </div>
    </div>
  );
}
