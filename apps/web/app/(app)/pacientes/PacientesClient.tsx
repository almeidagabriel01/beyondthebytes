'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PatientList } from '@/components/patients/patient-list';
import { PatientFormModal } from '@/components/patients/patient-form-modal';
import { PatientDetailDrawer } from '@/components/patients/patient-detail-drawer';

interface Props {
  selectedId: string | null;
}

export function PacientesClient({ selectedId }: Props) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);

  const openDrawer = useCallback(
    (id: string) => {
      router.replace(`/pacientes?id=${id}`, { scroll: false });
    },
    [router],
  );

  const closeDrawer = useCallback(() => {
    router.replace('/pacientes', { scroll: false });
  }, [router]);

  return (
    <div className="flex flex-col h-full p-6 gap-4 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Pacientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie o cadastro de pacientes</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-lg leading-none" aria-hidden="true">
            add
          </span>
          Novo Paciente
        </button>
      </div>

      <PatientList onSelect={openDrawer} />

      {showCreate && <PatientFormModal mode="create" onClose={() => setShowCreate(false)} />}

      <PatientDetailDrawer patientId={selectedId} onClose={closeDrawer} />
    </div>
  );
}
