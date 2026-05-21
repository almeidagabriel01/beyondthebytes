'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import {
  AppointmentTypeSchema,
  INSURANCE_OPTIONS,
  SLOT_DURATION_OPTIONS,
  getOpenSlots,
  formatSlotTime,
  type AppointmentResponse,
} from '@medschedule/shared';
import { updateAppointment, fetchDayAppointments } from '@/lib/appointments';
import { maskCurrency, parseCurrency, formatCurrencyValue } from '@/lib/currency';
import { cn } from '@/lib/utils';

const EditSchema = z.object({
  startsAt: z.string().min(1, 'Selecione um horário disponível'),
  durationMinutes: z.union([z.literal(30), z.literal(45), z.literal(60)]),
  type: AppointmentTypeSchema,
  insurance: z.string().min(1),
  value: z
    .string()
    .optional()
    .refine((v) => !v || parseCurrency(v) !== undefined, {
      message: 'Valor inválido',
    }),
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
  onSaved: () => void;
}

// Build YYYY-MM-DD in São Paulo timezone (matches what new-appointment-modal uses
// as the `dateField`) — keeps the slot ISOs comparable.
function toBrtIsoDate(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(iso));
}

export function EditAppointmentModal({ appointment, onClose, onSaved }: EditAppointmentModalProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const initialDate = toBrtIsoDate(appointment.startsAt);
  const initialStartsAt = new Date(appointment.startsAt).toISOString();
  const initialDuration = appointment.durationMinutes as 30 | 45 | 60;
  const [dateField, setDateField] = useState(initialDate);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EditForm>({
    resolver: zodResolver(EditSchema),
    defaultValues: {
      startsAt: initialStartsAt,
      durationMinutes: initialDuration,
      type: appointment.type,
      insurance: appointment.insurance,
      value: appointment.value != null ? formatCurrencyValue(Number(appointment.value)) : '',
      observations: appointment.observations ?? '',
    },
  });

  const durationMinutes = watch('durationMinutes') as number;

  // Reset selected slot whenever the date changes (so stale slot can't be saved),
  // but preserve the original slot on the original date.
  useEffect(() => {
    if (dateField === initialDate) {
      setValue('startsAt', initialStartsAt);
    } else {
      setValue('startsAt', '');
    }
  }, [dateField, setValue, initialDate, initialStartsAt]);

  const { data: dayAppointments = [] } = useQuery({
    queryKey: ['appointments-day', dateField],
    queryFn: () => fetchDayAppointments(dateField),
    staleTime: 30_000,
  });

  // Exclude the appointment being edited so its own slot isn't shown as occupied.
  // Also include the current slot as an always-available option on the original date,
  // even if `getOpenSlots` filters it out (e.g. past slot for an in-progress edit
  // of metadata only).
  const openSlots = useMemo(() => {
    const others = dayAppointments
      .filter((a) => a.id !== appointment.id)
      .map((a) => ({
        startsAt: new Date(a.startsAt),
        endsAt: new Date(a.endsAt),
        status: a.status,
      }));
    const slots = getOpenSlots(
      new Date(`${dateField}T12:00:00-03:00`),
      others,
      Number(durationMinutes),
    );
    if (dateField === initialDate) {
      const current = new Date(initialStartsAt);
      const has = slots.some((s) => s.getTime() === current.getTime());
      if (!has) {
        slots.push(current);
        slots.sort((a, b) => a.getTime() - b.getTime());
      }
    }
    return slots;
  }, [dayAppointments, appointment.id, dateField, durationMinutes, initialDate, initialStartsAt]);

  async function onSubmit(data: EditForm) {
    setServerError(null);
    try {
      await updateAppointment(appointment.id, {
        startsAt: data.startsAt,
        durationMinutes: data.durationMinutes,
        type: data.type,
        insurance: data.insurance,
        value: data.value ? parseCurrency(data.value) : undefined,
        observations: data.observations || undefined,
      });
      onSaved();
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
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
        <header className="px-6 py-5 border-b border-[#e2e8f0] flex items-center justify-between shrink-0">
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

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5 overflow-y-auto flex-1">
          {serverError && (
            <p className="text-[13px] text-[#ba1a1a] bg-[#ffdad6]/40 px-3 py-2 rounded-lg border border-[#ba1a1a]/20">
              {serverError}
            </p>
          )}

          {/* Patient (read-only — swapping patient on an existing appointment is not supported). */}
          <div>
            <label className="block text-[12px] font-semibold text-[#64748b] uppercase tracking-wide mb-1.5">
              Paciente
            </label>
            <div className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2.5 text-[14px] text-[#0f172a] bg-[#f8fafc]">
              {appointment.patient.fullName}
            </div>
          </div>

          {/* Date + Duration row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="edit-date"
                className="block text-[12px] font-semibold text-[#64748b] uppercase tracking-wide mb-1.5"
              >
                Data
              </label>
              <input
                id="edit-date"
                type="date"
                value={dateField}
                onChange={(e) => setDateField(e.target.value)}
                className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2.5 text-[14px] text-[#0f172a] bg-white focus:outline-none focus:ring-2 focus:ring-[#4648d4]/30"
              />
            </div>
            <div>
              <label
                htmlFor="edit-duration"
                className="block text-[12px] font-semibold text-[#64748b] uppercase tracking-wide mb-1.5"
              >
                Duração
              </label>
              <Controller
                name="durationMinutes"
                control={control}
                render={({ field }) => (
                  <select
                    id="edit-duration"
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2.5 text-[14px] text-[#0f172a] bg-white focus:outline-none focus:ring-2 focus:ring-[#4648d4]/30"
                  >
                    {SLOT_DURATION_OPTIONS.map((d) => (
                      <option key={d} value={d}>
                        {d} min
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>
          </div>

          {/* Slot picker */}
          <div>
            <label className="block text-[12px] font-semibold text-[#64748b] uppercase tracking-wide mb-1.5">
              Horário
            </label>
            {openSlots.length === 0 ? (
              <p className="text-[13px] text-[#64748b] italic">
                Nenhum horário disponível para esta data e duração.
              </p>
            ) : (
              <Controller
                name="startsAt"
                control={control}
                render={({ field }) => (
                  <div className="flex flex-wrap gap-2">
                    {openSlots.map((slot) => {
                      const iso = slot.toISOString();
                      const label = formatSlotTime(slot);
                      const selected = field.value === iso;
                      return (
                        <button
                          key={iso}
                          type="button"
                          onClick={() => field.onChange(iso)}
                          className={cn(
                            'rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors',
                            selected
                              ? 'border-[#4648d4] bg-[#4648d4] text-white'
                              : 'border-[#cbd5e1] bg-white text-[#0f172a] hover:border-[#4648d4] hover:bg-[#e1e0ff]/20',
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
              />
            )}
            {errors.startsAt && (
              <p className="text-[12px] text-[#ba1a1a] mt-1">{errors.startsAt.message}</p>
            )}
          </div>

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
              Valor
            </label>
            <Controller
              name="value"
              control={control}
              render={({ field }) => (
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="R$ 0,00"
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(maskCurrency(e.target.value))}
                  onBlur={field.onBlur}
                  className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2.5 text-[14px] text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#4648d4]/30"
                />
              )}
            />
            {errors.value && (
              <p className="text-[12px] text-[#ba1a1a] mt-1">{errors.value.message}</p>
            )}
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
