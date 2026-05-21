'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AppointmentTypeSchema,
  INSURANCE_OPTIONS,
  type AppointmentResponse,
} from '@medschedule/shared';
import { updateAppointment } from '@/lib/appointments';

const EditSchema = z.object({
  type: AppointmentTypeSchema,
  insurance: z.string().min(1),
  value: z.string().optional(),
  observations: z.string().max(1000).optional(),
});

type EditForm = z.infer<typeof EditSchema>;

const TYPE_OPTIONS = [
  { value: 'CONSULTA', label: 'Consulta' },
  { value: 'RETORNO', label: 'Retorno' },
  { value: 'AVALIACAO', label: 'Avaliação' },
  { value: 'PROCEDIMENTO', label: 'Procedimento' },
] as const;

interface EditAppointmentModalProps {
  appointment: AppointmentResponse;
  onClose: () => void;
  onSaved: (updated: AppointmentResponse) => void;
}

export function EditAppointmentModal({ appointment, onClose, onSaved }: EditAppointmentModalProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditForm>({
    resolver: zodResolver(EditSchema),
    defaultValues: {
      type: appointment.type,
      insurance: appointment.insurance,
      value: appointment.value != null ? String(appointment.value) : '',
      observations: appointment.observations ?? '',
    },
  });

  async function onSubmit(data: EditForm) {
    setServerError(null);
    try {
      const updated = await updateAppointment(appointment.id, {
        type: data.type,
        insurance: data.insurance,
        value: data.value ? Number(data.value) : undefined,
        observations: data.observations || undefined,
      });
      onSaved(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar. Tente novamente.';
      setServerError(msg);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        role="presentation"
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 flex flex-col">
        <header className="px-6 py-5 border-b border-[#e2e8f0] flex items-center justify-between">
          <h2 className="text-[18px] font-semibold text-[#0f172a]">Editar Consulta</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-2 text-[#64748b] hover:bg-[#f1f5f9] rounded-full transition-colors"
            aria-label="Fechar"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {serverError && (
            <p className="text-[13px] text-[#ba1a1a] bg-[#ffdad6]/40 px-3 py-2 rounded-lg border border-[#ba1a1a]/20">
              {serverError}
            </p>
          )}

          <div>
            <label className="block text-[12px] font-semibold text-[#64748b] uppercase tracking-wide mb-1.5">
              Tipo de Consulta
            </label>
            <select
              {...register('type')}
              className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2.5 text-[14px] text-[#0f172a] bg-white focus:outline-none focus:ring-2 focus:ring-[#4648d4]/30"
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {errors.type && (
              <p className="text-[12px] text-[#ba1a1a] mt-1">{errors.type.message}</p>
            )}
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#64748b] uppercase tracking-wide mb-1.5">
              Convênio / Pagamento
            </label>
            <select
              {...register('insurance')}
              className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2.5 text-[14px] text-[#0f172a] bg-white focus:outline-none focus:ring-2 focus:ring-[#4648d4]/30"
            >
              {INSURANCE_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            {errors.insurance && (
              <p className="text-[12px] text-[#ba1a1a] mt-1">{errors.insurance.message}</p>
            )}
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#64748b] uppercase tracking-wide mb-1.5">
              Valor (R$)
            </label>
            <input
              {...register('value')}
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2.5 text-[14px] text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#4648d4]/30"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#64748b] uppercase tracking-wide mb-1.5">
              Observações
            </label>
            <textarea
              {...register('observations')}
              rows={3}
              placeholder="Observações do agendamento..."
              className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2.5 text-[14px] text-[#0f172a] resize-none focus:outline-none focus:ring-2 focus:ring-[#4648d4]/30"
            />
            {errors.observations && (
              <p className="text-[12px] text-[#ba1a1a] mt-1">{errors.observations.message}</p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-[#e2e8f0] rounded-lg text-[14px] font-medium text-[#64748b] hover:bg-[#f8fafc] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-[#4648d4] text-white rounded-lg text-[14px] font-semibold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
