'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  INSURANCE_OPTIONS,
  SLOT_DURATION_OPTIONS,
  getOpenSlots,
  formatSlotTime,
  type CreateAppointment,
} from '@medschedule/shared';
import { createAppointment, fetchDayAppointments } from '@/lib/appointments';
import { clientEnv } from '@/lib/env';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

type PatientSuggestion = { id: string; fullName: string; cpf: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

function maskCurrency(v: string): string {
  const digits = v.replace(/\D/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10) / 100;
  return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function parseCurrency(masked: string): number | undefined {
  const raw = masked.replace(/[^\d,]/g, '').replace(',', '.');
  const n = parseFloat(raw);
  return isNaN(n) || n <= 0 ? undefined : n;
}

function todayIso(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

const FormSchema = z.object({
  patientId: z.string().min(1, 'Selecione um paciente'),
  startsAt: z.string().min(1, 'Selecione um horário disponível'),
  durationMinutes: z.union([z.literal(30), z.literal(45), z.literal(60)]),
  type: z.enum(['CONSULTA', 'RETORNO', 'AVALIACAO', 'PROCEDIMENTO'] as const, {
    errorMap: () => ({ message: 'Selecione o tipo de atendimento' }),
  }),
  insurance: z.string().min(1, 'Selecione um convênio'),
  value: z
    .string()
    .optional()
    .refine((v) => !v || parseCurrency(v) !== undefined, {
      message: 'Informe um valor válido (ex: R$ 150,00)',
    }),
  observations: z.string().max(1000, 'Máximo de 1000 caracteres').optional(),
});
type FormValues = z.infer<typeof FormSchema>;

// ── Component ─────────────────────────────────────────────────────────────────

interface NewAppointmentModalProps {
  defaultDate?: string;
  onClose: () => void;
}

export function NewAppointmentModal({ defaultDate, onClose }: NewAppointmentModalProps) {
  const queryClient = useQueryClient();
  const backdropRef = useRef<HTMLDivElement>(null);

  // ── Patient search state ────────────────────────────────────────────────────
  const [patientQuery, setPatientQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientSuggestion | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(patientQuery), 300);
    return () => clearTimeout(t);
  }, [patientQuery]);

  const { data: patientResults, isFetching: searchFetching } = useQuery<PatientSuggestion[]>({
    queryKey: ['patients-search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return [];
      const res = await fetch(
        `${clientEnv.NEXT_PUBLIC_API_URL}/patients?search=${encodeURIComponent(debouncedQuery)}&limit=10`,
        { credentials: 'include' },
      );
      if (!res.ok) return [];
      const data = (await res.json()) as { items?: PatientSuggestion[] };
      return data.items ?? [];
    },
    enabled: debouncedQuery.trim().length >= 1,
    staleTime: 10_000,
  });

  // ── Form ────────────────────────────────────────────────────────────────────
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      patientId: '',
      startsAt: '',
      durationMinutes: 30,
      type: 'CONSULTA',
      insurance: 'Particular',
      value: '',
      observations: '',
    },
  });

  const selectedDate = watch('startsAt')
    ? (watch('startsAt').split('T')[0] ?? defaultDate ?? todayIso())
    : (defaultDate ?? todayIso());
  const [dateField, setDateField] = useState(defaultDate ?? todayIso());
  const durationMinutes = watch('durationMinutes') as number;
  const insurance = watch('insurance');
  const isParticular = insurance === 'Particular';

  // ── Day appointments ────────────────────────────────────────────────────────
  const { data: dayAppointments = [] } = useQuery({
    queryKey: ['appointments-day', dateField],
    queryFn: () => fetchDayAppointments(dateField),
    staleTime: 30_000,
  });

  const openSlots = getOpenSlots(
    new Date(`${dateField}T12:00:00-03:00`),
    dayAppointments.map((a) => ({
      startsAt: new Date(a.startsAt),
      endsAt: new Date(a.endsAt),
      status: a.status,
    })),
    Number(durationMinutes),
  );

  // ── Mutation ────────────────────────────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: (dto: CreateAppointment) => createAppointment(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments-day', dateField] });
      queryClient.invalidateQueries({ queryKey: ['month-summary'] });
      onClose();
    },
  });

  const onSubmit = handleSubmit((data) => {
    const dto: CreateAppointment = {
      patientId: data.patientId,
      startsAt: data.startsAt,
      durationMinutes: Number(data.durationMinutes) as 30 | 45 | 60,
      type: data.type,
      insurance: data.insurance,
      observations: data.observations || undefined,
      value: isParticular && data.value ? parseCurrency(data.value) : undefined,
    };
    mutation.mutate(dto);
  });

  // ── Keyboard / backdrop ─────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Close patient dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Input class helper ──────────────────────────────────────────────────────
  const inputClass = (hasError: boolean) =>
    cn(
      'w-full rounded-lg border px-3 py-2 text-sm outline-none transition',
      'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
      hasError ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white',
    );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-appointment-title"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600">calendar_add_on</span>
            <h2 id="new-appointment-title" className="text-lg font-semibold text-gray-900">
              Novo Agendamento
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Fechar modal"
          >
            <span className="material-symbols-outlined text-xl leading-none">close</span>
          </button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={onSubmit} noValidate className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Patient search */}
          <div ref={searchRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Paciente <span className="text-red-500">*</span>
            </label>
            {selectedPatient ? (
              <div className="flex items-center justify-between rounded-lg border border-blue-500 bg-blue-50 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{selectedPatient.fullName}</p>
                  <p className="text-xs text-gray-500">CPF: {selectedPatient.cpf}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPatient(null);
                    setPatientQuery('');
                    setValue('patientId', '');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Remover paciente"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            ) : (
              <input
                type="text"
                value={patientQuery}
                onChange={(e) => {
                  setPatientQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Buscar por nome..."
                className={inputClass(!!errors.patientId)}
                autoComplete="off"
              />
            )}
            {errors.patientId && (
              <p className="mt-1 text-xs text-red-600">{errors.patientId.message}</p>
            )}

            {/* Dropdown */}
            {showDropdown && !selectedPatient && debouncedQuery.trim().length >= 1 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-10 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
                {searchFetching ? (
                  <div className="px-3 py-2 text-sm text-gray-500">Buscando...</div>
                ) : patientResults && patientResults.length > 0 ? (
                  <ul>
                    {patientResults.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors"
                          onClick={() => {
                            setSelectedPatient(p);
                            setValue('patientId', p.id, { shouldValidate: true });
                            setShowDropdown(false);
                          }}
                        >
                          <span className="font-medium text-gray-900">{p.fullName}</span>
                          <span className="ml-2 text-gray-400 text-xs">CPF: {p.cpf}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-500">Nenhum paciente encontrado.</div>
                )}
              </div>
            )}
            {/* Hidden field for RHF */}
            <input type="hidden" {...register('patientId')} />
          </div>

          {/* Date + Duration row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="appt-date" className="block text-sm font-medium text-gray-700 mb-1">
                Data <span className="text-red-500">*</span>
              </label>
              <input
                id="appt-date"
                type="date"
                value={dateField}
                onChange={(e) => setDateField(e.target.value)}
                className={inputClass(false)}
              />
            </div>

            <div>
              <label
                htmlFor="durationMinutes"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Duração <span className="text-red-500">*</span>
              </label>
              <Controller
                name="durationMinutes"
                control={control}
                render={({ field }) => (
                  <select
                    id="durationMinutes"
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    className={inputClass(!!errors.durationMinutes)}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Horário <span className="text-red-500">*</span>
            </label>
            {openSlots.length === 0 ? (
              <p className="text-sm text-gray-500 italic">
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
                            'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                            selected
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50',
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
              <p className="mt-1 text-xs text-red-600">{errors.startsAt.message}</p>
            )}
          </div>

          {/* Type + Insurance row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="appt-type" className="block text-sm font-medium text-gray-700 mb-1">
                Tipo <span className="text-red-500">*</span>
              </label>
              <select id="appt-type" {...register('type')} className={inputClass(!!errors.type)}>
                <option value="CONSULTA">Consulta</option>
                <option value="RETORNO">Retorno</option>
                <option value="AVALIACAO">Avaliação</option>
                <option value="PROCEDIMENTO">Procedimento</option>
              </select>
              {errors.type && <p className="mt-1 text-xs text-red-600">{errors.type.message}</p>}
            </div>

            <div>
              <label
                htmlFor="appt-insurance"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Convênio <span className="text-red-500">*</span>
              </label>
              <select
                id="appt-insurance"
                {...register('insurance')}
                className={inputClass(!!errors.insurance)}
              >
                {INSURANCE_OPTIONS.map((ins) => (
                  <option key={ins} value={ins}>
                    {ins}
                  </option>
                ))}
              </select>
              {errors.insurance && (
                <p className="mt-1 text-xs text-red-600">{errors.insurance.message}</p>
              )}
            </div>
          </div>

          {/* Value — only for Particular */}
          <div
            className={cn(
              'overflow-hidden transition-all duration-300',
              isParticular ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0',
            )}
          >
            <label htmlFor="appt-value" className="block text-sm font-medium text-gray-700 mb-1">
              Valor da consulta
            </label>
            <Controller
              name="value"
              control={control}
              render={({ field }) => (
                <input
                  id="appt-value"
                  type="text"
                  inputMode="numeric"
                  placeholder="R$ 0,00"
                  value={field.value}
                  onChange={(e) => field.onChange(maskCurrency(e.target.value))}
                  onBlur={field.onBlur}
                  className={inputClass(!!errors.value)}
                />
              )}
            />
            {errors.value && <p className="mt-1 text-xs text-red-600">{errors.value.message}</p>}
          </div>

          {/* Observations */}
          <div>
            <label
              htmlFor="appt-observations"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Observações
            </label>
            <textarea
              id="appt-observations"
              {...register('observations')}
              rows={3}
              className={cn(inputClass(!!errors.observations), 'resize-none')}
              placeholder="Informações adicionais, queixas..."
            />
            {errors.observations && (
              <p className="mt-1 text-xs text-red-600">{errors.observations.message}</p>
            )}
          </div>

          {/* Server error */}
          {mutation.isError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 border border-red-200">
              {(mutation.error as Error).message}
            </p>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t px-6 py-4 shrink-0 bg-white rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form=""
            onClick={onSubmit}
            disabled={mutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {mutation.isPending && (
              <span className="material-symbols-outlined text-base animate-spin leading-none">
                progress_activity
              </span>
            )}
            Salvar Agendamento
          </button>
        </div>
      </div>
    </div>
  );
}
