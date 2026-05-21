'use client';

import { useEffect, useRef } from 'react';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CreatePatientSchema, type CreatePatient, type PatientResponse } from '@medschedule/shared';
import { clientEnv } from '@/lib/env';
import { cn } from '@/lib/utils';

function maskCpf(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function maskPhone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

type FormValues = {
  fullName: string;
  cpf: string;
  phone: string;
  birthDate: string;
  email: string;
  observations: string;
};

interface PatientFormModalProps {
  mode: 'create' | 'edit';
  patient?: PatientResponse;
  onClose: () => void;
}

export function PatientFormModal({ mode, patient, onClose }: PatientFormModalProps) {
  const queryClient = useQueryClient();
  const backdropRef = useRef<HTMLDivElement>(null);

  const defaultValues: FormValues = patient
    ? {
        fullName: patient.fullName,
        cpf: maskCpf(patient.cpf),
        phone: patient.phone,
        birthDate: patient.birthDate.slice(0, 10),
        email: patient.email ?? '',
        observations: patient.observations ?? '',
      }
    : { fullName: '', cpf: '', phone: '', birthDate: '', email: '', observations: '' };

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(CreatePatientSchema) as Resolver<FormValues>,
    defaultValues,
  });

  useEffect(() => {
    reset(
      patient
        ? {
            fullName: patient.fullName,
            cpf: maskCpf(patient.cpf),
            phone: patient.phone,
            birthDate: patient.birthDate.slice(0, 10),
            email: patient.email ?? '',
            observations: patient.observations ?? '',
          }
        : { fullName: '', cpf: '', phone: '', birthDate: '', email: '', observations: '' },
    );
  }, [patient, reset]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const mutation = useMutation({
    mutationFn: async (data: CreatePatient) => {
      const url =
        mode === 'create'
          ? `${clientEnv.NEXT_PUBLIC_API_URL}/patients`
          : `${clientEnv.NEXT_PUBLIC_API_URL}/patients/${patient!.id}`;

      const res = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message ?? 'Erro ao salvar paciente');
      }

      return res.status === 204 ? null : (res.json() as Promise<PatientResponse>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      onClose();
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
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="patient-modal-title"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 id="patient-modal-title" className="text-lg font-semibold text-gray-900">
            {mode === 'create' ? 'Novo Paciente' : 'Editar Paciente'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Fechar modal"
          >
            <span className="material-symbols-outlined text-xl leading-none">close</span>
          </button>
        </div>

        <form onSubmit={onSubmit} noValidate className="px-6 py-5 space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
              Nome completo <span className="text-red-500">*</span>
            </label>
            <input
              id="fullName"
              type="text"
              {...register('fullName')}
              className={inputClass(!!errors.fullName)}
              placeholder="Maria Oliveira"
            />
            {errors.fullName && (
              <p className="mt-1 text-xs text-red-600">{errors.fullName.message}</p>
            )}
          </div>

          <Controller
            name="cpf"
            control={control}
            render={({ field }) => (
              <div>
                <label htmlFor="cpf" className="block text-sm font-medium text-gray-700 mb-1">
                  CPF <span className="text-red-500">*</span>
                </label>
                <input
                  id="cpf"
                  type="text"
                  inputMode="numeric"
                  value={field.value}
                  onChange={(e) => field.onChange(maskCpf(e.target.value))}
                  onBlur={field.onBlur}
                  className={inputClass(!!errors.cpf)}
                  placeholder="000.000.000-00"
                />
                {errors.cpf && <p className="mt-1 text-xs text-red-600">{errors.cpf.message}</p>}
              </div>
            )}
          />

          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone <span className="text-red-500">*</span>
                </label>
                <input
                  id="phone"
                  type="text"
                  inputMode="numeric"
                  value={field.value}
                  onChange={(e) => field.onChange(maskPhone(e.target.value))}
                  onBlur={field.onBlur}
                  className={inputClass(!!errors.phone)}
                  placeholder="(11) 91234-5678"
                />
                {errors.phone && (
                  <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>
                )}
              </div>
            )}
          />

          <div>
            <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700 mb-1">
              Data de nascimento <span className="text-red-500">*</span>
            </label>
            <input
              id="birthDate"
              type="date"
              {...register('birthDate')}
              className={inputClass(!!errors.birthDate)}
            />
            {errors.birthDate && (
              <p className="mt-1 text-xs text-red-600">{errors.birthDate.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              {...register('email')}
              className={inputClass(!!errors.email)}
              placeholder="paciente@email.com"
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="observations" className="block text-sm font-medium text-gray-700 mb-1">
              Observações
            </label>
            <textarea
              id="observations"
              {...register('observations')}
              rows={3}
              className={cn(inputClass(!!errors.observations), 'resize-none')}
              placeholder="Alergias, condições especiais..."
            />
            {errors.observations && (
              <p className="mt-1 text-xs text-red-600">{errors.observations.message}</p>
            )}
          </div>

          {mutation.isError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 border border-red-200">
              {(mutation.error as Error).message}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {mutation.isPending ? 'Salvando...' : mode === 'create' ? 'Criar Paciente' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
