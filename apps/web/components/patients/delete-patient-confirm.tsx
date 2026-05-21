'use client';

import type { PatientResponse } from '@medschedule/shared';

interface DeletePatientConfirmProps {
  patient: PatientResponse;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
  error?: string | null;
}

export function DeletePatientConfirm({
  patient,
  onConfirm,
  onCancel,
  isPending,
  error,
}: DeletePatientConfirmProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-patient-confirm-title"
    >
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl mx-4 p-6">
        <h2
          id="delete-patient-confirm-title"
          className="text-base font-semibold text-gray-900 mb-2"
        >
          Excluir paciente?
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          <span className="font-medium">{patient.fullName}</span> será removido(a) do sistema. Esta
          ação não pode ser desfeita.
        </p>
        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 border border-red-200">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? 'Excluindo...' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  );
}
