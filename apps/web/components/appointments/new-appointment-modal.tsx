'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
import { PatientQuickRegisterModal } from './patient-quick-register-modal';

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
  const [showPatientModal, setShowPatientModal] = useState(false);
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

  const [dateField, setDateField] = useState(defaultDate ?? todayIso());
  const durationMinutes = watch('durationMinutes') as number;
  const insurance = watch('insurance');
  const isParticular = insurance === 'Particular';

  // Clear the selected slot whenever the date changes so a stale slot can't be submitted
  useEffect(() => {
    setValue('startsAt', '');
  }, [dateField, setValue]);

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
    onSuccess: (_data, variables) => {
      const submittedDate = variables.startsAt.slice(0, 10);
      queryClient.invalidateQueries({ queryKey: ['appointments-day', submittedDate] });
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
      'focus:border-[#4648d4] focus:ring-2 focus:ring-[#4648d4]/20',
      hasError ? 'border-red-400 bg-red-50' : 'border-[#cbd5e1] bg-white',
    );

  const handlePatientCreated = useCallback(
    (patient: { id: string; fullName: string; cpf: string }) => {
      setSelectedPatient(patient);
      setValue('patientId', patient.id, { shouldValidate: true });
      setShowPatientModal(false);
    },
    [setValue],
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
            <span
              className="material-symbols-outlined text-[#4648d4] text-2xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              calendar_add_on
            </span>
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
              <div className="flex items-center justify-between rounded-lg border border-[#4648d4] bg-[#e1e0ff]/20 px-3 py-2 h-12">
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
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] text-[18px] leading-none pointer-events-none">
                    search
                  </span>
                  <input
                    type="text"
                    value={patientQuery}
                    onChange={(e) => {
                      setPatientQuery(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Buscar por nome..."
                    className={cn(inputClass(!!errors.patientId), 'pl-10 pr-4 h-12')}
                    autoComplete="off"
                  />
                </div>
                <span className="text-[#475569] text-[12px]">ou</span>
                <button
                  type="button"
                  onClick={() => setShowPatientModal(true)}
                  className="whitespace-nowrap px-4 py-2 h-12 text-[#4648d4] text-[12px] font-medium bg-[#e1e0ff]/20 hover:bg-[#e1e0ff]/40 rounded-lg flex items-center gap-2 border border-[#e1e0ff] transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px] leading-none">
                    person_add
                  </span>
                  Cadastrar novo
                </button>
              </div>
            )}
            {errors.patientId && (
              <p className="mt-1 text-xs text-red-600">{errors.patientId.message}</p>
            )}

            {/* Dropdown */}
            {showDropdown && !selectedPatient && debouncedQuery.trim().length >= 1 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-10 rounded-lg border border-[#cbd5e1] bg-white shadow-lg overflow-hidden">
                {searchFetching ? (
                  <div className="px-3 py-2 text-sm text-gray-500">Buscando...</div>
                ) : patientResults && patientResults.length > 0 ? (
                  <ul>
                    {patientResults.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-[#e1e0ff]/20 transition-colors"
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
                              ? 'border-[#4648d4] bg-[#4648d4] text-white'
                              : 'border-[#cbd5e1] bg-white text-gray-700 hover:border-[#4648d4] hover:bg-[#e1e0ff]/20',
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
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] text-[18px] leading-none pointer-events-none">
                  medical_services
                </span>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] text-[18px] leading-none pointer-events-none">
                  expand_more
                </span>
                <select
                  id="appt-type"
                  {...register('type')}
                  className={cn(inputClass(!!errors.type), 'pl-10 pr-8 appearance-none')}
                >
                  <option value="CONSULTA">Consulta</option>
                  <option value="RETORNO">Retorno</option>
                  <option value="AVALIACAO">Avaliação</option>
                  <option value="PROCEDIMENTO">Procedimento</option>
                </select>
              </div>
              {errors.type && <p className="mt-1 text-xs text-red-600">{errors.type.message}</p>}
            </div>

            <div>
              <label
                htmlFor="appt-insurance"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Convênio <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] text-[18px] leading-none pointer-events-none">
                  health_and_safety
                </span>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] text-[18px] leading-none pointer-events-none">
                  expand_more
                </span>
                <select
                  id="appt-insurance"
                  {...register('insurance')}
                  className={cn(inputClass(!!errors.insurance), 'pl-10 pr-8 appearance-none')}
                >
                  {INSURANCE_OPTIONS.map((ins) => (
                    <option key={ins} value={ins}>
                      {ins}
                    </option>
                  ))}
                </select>
              </div>
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
              {(() => {
                const err = mutation.error as Error & { body?: { message?: string } };
                return err.body?.message ?? err.message;
              })()}
            </p>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[#cbd5e1] px-6 py-4 shrink-0 bg-white rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-[#475569] hover:bg-[#e2e8f0] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={mutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-[#4648d4] px-5 py-2 text-sm font-medium text-white hover:bg-[#3323cc] shadow-sm min-w-[120px] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
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

      {showPatientModal && (
        <PatientQuickRegisterModal
          onBack={() => setShowPatientModal(false)}
          onClose={onClose}
          onCreated={handlePatientCreated}
        />
      )}
    </div>
  );
}
