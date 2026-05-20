'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { PatientResponse } from '@medschedule/shared';
import { clientEnv } from '@/lib/env';
import { PatientFormModal } from '@/components/patients/patient-form-modal';

function formatCpf(digits: string): string {
  if (digits.length !== 11) return digits;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

interface DetailRowProps {
  label: string;
  value: string | null | undefined;
}

function DetailRow({ label, value }: DetailRowProps) {
  if (!value) return null;
  return (
    <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{value}</dd>
    </div>
  );
}

interface PatientDetailClientProps {
  patient: PatientResponse;
}

export function PatientDetailClient({ patient }: PatientDetailClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${clientEnv.NEXT_PUBLIC_API_URL}/patients/${patient.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok && res.status !== 204) throw new Error('Erro ao excluir paciente');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      router.push('/pacientes');
    },
  });

  return (
    <div className="max-w-3xl mx-auto p-6 w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          aria-label="Voltar"
        >
          <span className="material-symbols-outlined text-xl leading-none">arrow_back</span>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 truncate">
            {patient.fullName}
          </h1>
          <p className="text-sm text-gray-500">{formatCpf(patient.cpf)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <span className="material-symbols-outlined text-lg leading-none" aria-hidden="true">
              edit
            </span>
            Editar
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <span className="material-symbols-outlined text-lg leading-none" aria-hidden="true">
              delete
            </span>
            Excluir
          </button>
        </div>
      </div>

      {/* Details card */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Dados do Paciente
          </h2>
        </div>
        <dl className="divide-y divide-gray-100 px-6">
          <DetailRow label="Nome completo" value={patient.fullName} />
          <DetailRow label="CPF" value={formatCpf(patient.cpf)} />
          <DetailRow label="Telefone" value={patient.phone} />
          <DetailRow label="Data de nascimento" value={formatDate(patient.birthDate)} />
          <DetailRow label="E-mail" value={patient.email} />
          <DetailRow label="Observações" value={patient.observations} />
        </dl>
      </div>

      {/* Meta */}
      <p className="mt-4 text-xs text-gray-400 text-center">
        Cadastrado em {formatDate(patient.createdAt)} por{' '}
        <span className="font-medium">{patient.createdBy.name || patient.createdBy.email}</span>
      </p>

      {/* Edit modal */}
      {editing && (
        <PatientFormModal mode="edit" patient={patient} onClose={() => setEditing(false)} />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-detail-title"
        >
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl mx-4 p-6">
            <h2 id="delete-detail-title" className="text-base font-semibold text-gray-900 mb-2">
              Excluir paciente?
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              <span className="font-medium">{patient.fullName}</span> será removido(a) do sistema.
              Esta ação não pode ser desfeita.
            </p>
            {deleteMutation.isError && (
              <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 border border-red-200">
                {(deleteMutation.error as Error).message}
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={deleteMutation.isPending}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
