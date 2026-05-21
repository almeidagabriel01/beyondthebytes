'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PatientResponse } from '@medschedule/shared';
import { RightDrawer } from '@/components/shared/right-drawer';
import { PatientFormModal } from '@/components/patients/patient-form-modal';
import { DeletePatientConfirm } from '@/components/patients/delete-patient-confirm';
import { deletePatient, fetchPatient } from '@/lib/patients';

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
      <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0 break-words">{value}</dd>
    </div>
  );
}

interface PatientDetailDrawerProps {
  patientId: string | null;
  onClose: () => void;
}

interface DrawerBodyProps {
  patientId: string;
  onClose: () => void;
}

function DrawerBody({ patientId, onClose }: DrawerBodyProps) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const patientQuery = useQuery<PatientResponse>({
    queryKey: ['patient', patientId],
    queryFn: () => fetchPatient(patientId),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePatient(patientId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patients'] });
      qc.removeQueries({ queryKey: ['patient', patientId] });
      setConfirmDelete(false);
      onClose();
    },
  });

  if (patientQuery.status === 'pending') {
    return (
      <RightDrawer open onClose={onClose} title="Detalhe do Paciente" width="md">
        <div className="space-y-4">
          <div className="h-24 bg-white rounded-xl border border-[#e2e8f0] animate-pulse" />
          <div className="h-48 bg-white rounded-xl border border-[#e2e8f0] animate-pulse" />
        </div>
      </RightDrawer>
    );
  }

  if (patientQuery.status === 'error') {
    const err = patientQuery.error as Error & { status?: number };
    const isNotFound = err.status === 404;
    return (
      <RightDrawer open onClose={onClose} title="Detalhe do Paciente" width="md">
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-8 text-center">
          <span className="material-symbols-outlined text-[40px] text-[#94a3b8] mb-3 block">
            {isNotFound ? 'search_off' : 'error'}
          </span>
          <p className="text-[14px] text-[#64748b] mb-4">
            {isNotFound ? 'Paciente não encontrado.' : err.message}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#4648d4] text-white text-[13px] font-semibold hover:opacity-90"
          >
            Fechar
          </button>
        </div>
      </RightDrawer>
    );
  }

  const patient = patientQuery.data;

  const headerActions = (
    <>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-[12px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <span className="material-symbols-outlined text-[16px] leading-none" aria-hidden="true">
          edit
        </span>
        Editar
      </button>
      <button
        type="button"
        onClick={() => setConfirmDelete(true)}
        className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-[12px] font-semibold text-red-600 hover:bg-red-50 transition-colors"
      >
        <span className="material-symbols-outlined text-[16px] leading-none" aria-hidden="true">
          delete
        </span>
        Excluir
      </button>
    </>
  );

  return (
    <>
      <RightDrawer
        open
        onClose={onClose}
        title={patient.fullName}
        ariaLabel={`Detalhe do paciente ${patient.fullName}`}
        headerActions={headerActions}
        width="md"
      >
        <div className="space-y-4">
          {/* Identity card */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-1">
              CPF
            </p>
            <p className="text-[15px] font-medium text-gray-900">{formatCpf(patient.cpf)}</p>
          </div>

          {/* Details */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Dados do Paciente
              </h3>
            </div>
            <dl className="divide-y divide-gray-100 px-5">
              <DetailRow label="Nome completo" value={patient.fullName} />
              <DetailRow label="CPF" value={formatCpf(patient.cpf)} />
              <DetailRow label="Telefone" value={patient.phone} />
              <DetailRow label="Data de nascimento" value={formatDate(patient.birthDate)} />
              <DetailRow label="E-mail" value={patient.email} />
              <DetailRow label="Observações" value={patient.observations} />
            </dl>
          </div>

          <p className="text-xs text-gray-400 text-center">
            Cadastrado em {formatDate(patient.createdAt)} por{' '}
            <span className="font-medium">{patient.createdBy.name || patient.createdBy.email}</span>
          </p>
        </div>
      </RightDrawer>

      {editing && (
        <PatientFormModal mode="edit" patient={patient} onClose={() => setEditing(false)} />
      )}

      {confirmDelete && (
        <DeletePatientConfirm
          patient={patient}
          onConfirm={() => deleteMutation.mutate()}
          onCancel={() => setConfirmDelete(false)}
          isPending={deleteMutation.isPending}
          error={deleteMutation.isError ? (deleteMutation.error as Error).message : null}
        />
      )}
    </>
  );
}

export function PatientDetailDrawer({ patientId, onClose }: PatientDetailDrawerProps) {
  if (!patientId) return null;
  return <DrawerBody key={patientId} patientId={patientId} onClose={onClose} />;
}
