'use client';

import { useForm, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { CreatePatientSchema, type CreatePatient } from '@medschedule/shared';
import { clientEnv } from '@/lib/env';
import { cn } from '@/lib/utils';

// ── Mask helpers ──────────────────────────────────────────────────────────────

function maskCpf(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return d.slice(0, 3) + '.' + d.slice(3);
  if (d.length <= 9) return d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6);
  return d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6, 9) + '-' + d.slice(9);
}

function maskPhone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type CreatedPatient = { id: string; fullName: string; cpf: string };

type FormValues = {
  fullName: string;
  cpf: string;
  phone: string;
  birthDate: string;
  email: string;
  observations: string;
};

interface PatientQuickRegisterModalProps {
  onBack: () => void;
  onClose: () => void;
  onCreated: (patient: CreatedPatient) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PatientQuickRegisterModal({
  onBack,
  onClose,
  onCreated,
}: PatientQuickRegisterModalProps) {
  const queryClient = useQueryClient();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(CreatePatientSchema) as Resolver<FormValues>,
    defaultValues: {
      fullName: '',
      cpf: '',
      phone: '',
      birthDate: '',
      email: '',
      observations: '',
    },
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBack();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onBack]);

  const mutation = useMutation({
    mutationFn: async (data: CreatePatient) => {
      const res = await fetch(`${clientEnv.NEXT_PUBLIC_API_URL}/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message ?? 'Erro ao cadastrar paciente');
      }
      return res.json() as Promise<CreatedPatient & { cpf: string }>;
    },
    onSuccess: (patient) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      onCreated({ id: patient.id, fullName: patient.fullName, cpf: patient.cpf });
    },
  });

  const onSubmit = handleSubmit((data) => mutation.mutate(data as unknown as CreatePatient));

  const inputClass = (hasError: boolean) =>
    cn(
      'w-full rounded-lg border px-3 py-2 text-sm outline-none transition',
      'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
      hasError ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white',
    );

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-register-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 border-b px-6 py-4 shrink-0">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Voltar"
          >
            <span className="material-symbols-outlined text-xl leading-none">arrow_back</span>
          </button>
          <span className="material-symbols-outlined text-blue-600">person_add</span>
          <h2 id="quick-register-title" className="text-lg font-semibold text-gray-900">
            Cadastrar Novo Paciente
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Fechar modal"
          >
            <span className="material-symbols-outlined text-xl leading-none">close</span>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={onSubmit} noValidate className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {/* Full name */}
          <div>
            <label htmlFor="qr-fullName" className="block text-sm font-medium text-gray-700 mb-1">
              Nome completo <span className="text-red-500">*</span>
            </label>
            <input
              id="qr-fullName"
              type="text"
              {...register('fullName')}
              placeholder="Maria Oliveira"
              className={inputClass(!!errors.fullName)}
            />
            {errors.fullName && (
              <p className="mt-1 text-xs text-red-600">{errors.fullName.message}</p>
            )}
          </div>

          {/* CPF */}
          <Controller
            name="cpf"
            control={control}
            render={({ field }) => (
              <div>
                <label htmlFor="qr-cpf" className="block text-sm font-medium text-gray-700 mb-1">
                  CPF <span className="text-red-500">*</span>
                </label>
                <input
                  id="qr-cpf"
                  type="text"
                  inputMode="numeric"
                  value={field.value}
                  onChange={(e) => field.onChange(maskCpf(e.target.value))}
                  onBlur={field.onBlur}
                  placeholder="000.000.000-00"
                  className={inputClass(!!errors.cpf)}
                />
                {errors.cpf && <p className="mt-1 text-xs text-red-600">{errors.cpf.message}</p>}
              </div>
            )}
          />

          {/* Phone */}
          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <div>
                <label htmlFor="qr-phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone <span className="text-red-500">*</span>
                </label>
                <input
                  id="qr-phone"
                  type="text"
                  inputMode="numeric"
                  value={field.value}
                  onChange={(e) => field.onChange(maskPhone(e.target.value))}
                  onBlur={field.onBlur}
                  placeholder="(11) 91234-5678"
                  className={inputClass(!!errors.phone)}
                />
                {errors.phone && (
                  <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>
                )}
              </div>
            )}
          />

          {/* Birth date */}
          <div>
            <label htmlFor="qr-birthDate" className="block text-sm font-medium text-gray-700 mb-1">
              Data de nascimento <span className="text-red-500">*</span>
            </label>
            <input
              id="qr-birthDate"
              type="date"
              {...register('birthDate')}
              className={inputClass(!!errors.birthDate)}
            />
            {errors.birthDate && (
              <p className="mt-1 text-xs text-red-600">{errors.birthDate.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="qr-email" className="block text-sm font-medium text-gray-700 mb-1">
              E-mail
            </label>
            <input
              id="qr-email"
              type="email"
              {...register('email')}
              placeholder="paciente@email.com"
              className={inputClass(!!errors.email)}
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>

          {/* Observations */}
          <div>
            <label
              htmlFor="qr-observations"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Observações
            </label>
            <textarea
              id="qr-observations"
              {...register('observations')}
              rows={3}
              className={cn(inputClass(!!errors.observations), 'resize-none')}
              placeholder="Alergias, condições especiais..."
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
            onClick={onBack}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Voltar
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
            Cadastrar Paciente
          </button>
        </div>
      </div>
    </div>
  );
}
