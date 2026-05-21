'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { PatientsListResponse, PatientResponse } from '@medschedule/shared';
import { clientEnv } from '@/lib/env';
import { cn, getInitials } from '@/lib/utils';
import { PatientFormModal } from './patient-form-modal';
import { DeletePatientConfirm } from './delete-patient-confirm';

async function fetchPatients(params: {
  search?: string;
  cursor?: string;
  limit?: number;
}): Promise<PatientsListResponse> {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.cursor) qs.set('cursor', params.cursor);
  if (params.limit) qs.set('limit', String(params.limit));

  const res = await fetch(`${clientEnv.NEXT_PUBLIC_API_URL}/patients?${qs}`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Erro ao carregar pacientes');
  return res.json() as Promise<PatientsListResponse>;
}

function useDebounce(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-100">
      <div className="h-9 w-9 rounded-full bg-gray-200 animate-pulse shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-40 rounded bg-gray-200 animate-pulse" />
        <div className="h-3 w-28 rounded bg-gray-200 animate-pulse" />
      </div>
      <div className="h-3 w-20 rounded bg-gray-200 animate-pulse" />
    </div>
  );
}

function PatientAvatar({ name }: { name: string }) {
  return (
    <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold shrink-0">
      {getInitials(name)}
    </div>
  );
}

function formatCpfDisplay(digits: string): string {
  if (digits.length !== 11) return digits;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

interface PatientRowProps {
  patient: PatientResponse;
  onEdit: (p: PatientResponse) => void;
  onDelete: (p: PatientResponse) => void;
  onSelect: (id: string) => void;
}

function PatientRow({ patient, onEdit, onDelete, onSelect }: PatientRowProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(patient.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(patient.id);
        }
      }}
      className="flex items-center gap-4 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors group cursor-pointer focus:outline-none focus:bg-gray-50"
      aria-label={`Abrir paciente ${patient.fullName}`}
    >
      <PatientAvatar name={patient.fullName} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{patient.fullName}</p>
        <p className="text-xs text-gray-500">{formatCpfDisplay(patient.cpf)}</p>
      </div>
      <p className="text-xs text-gray-400 hidden sm:block">{patient.phone}</p>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(patient);
          }}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
          aria-label={`Editar ${patient.fullName}`}
        >
          <span className="material-symbols-outlined text-lg leading-none">edit</span>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(patient);
          }}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
          aria-label={`Excluir ${patient.fullName}`}
        >
          <span className="material-symbols-outlined text-lg leading-none">delete</span>
        </button>
      </div>
    </div>
  );
}

interface PatientListProps {
  onSelect: (id: string) => void;
}

export function PatientList({ onSelect }: PatientListProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [editingPatient, setEditingPatient] = useState<PatientResponse | null>(null);
  const [deletingPatient, setDeletingPatient] = useState<PatientResponse | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status, error } = useInfiniteQuery({
    queryKey: ['patients', { search: debouncedSearch }],
    queryFn: ({ pageParam }) => {
      const params: Parameters<typeof fetchPatients>[0] = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (pageParam) params.cursor = pageParam as string;
      return fetchPatients(params);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const deleteMutation = useMutation({
    mutationFn: async (patientId: string) => {
      const res = await fetch(`${clientEnv.NEXT_PUBLIC_API_URL}/patients/${patientId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok && res.status !== 204) throw new Error('Erro ao excluir paciente');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setDeletingPatient(null);
    },
  });

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const allPatients = data?.pages.flatMap((p) => p.items) ?? [];

  const handleEdit = useCallback((p: PatientResponse) => setEditingPatient(p), []);
  const handleDeleteRequest = useCallback((p: PatientResponse) => setDeletingPatient(p), []);

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="relative mb-4">
        <span
          className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg leading-none pointer-events-none"
          aria-hidden="true"
        >
          search
        </span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome..."
          className={cn(
            'w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-4 text-sm outline-none transition',
            'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
          )}
        />
      </div>

      {/* List */}
      <div className="flex-1 rounded-xl border border-gray-200 bg-white overflow-hidden">
        {status === 'pending' && (
          <>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="material-symbols-outlined text-4xl text-red-400 mb-3">error</span>
            <p className="text-sm text-gray-600">{(error as Error).message}</p>
          </div>
        )}

        {status === 'success' && allPatients.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="material-symbols-outlined text-4xl text-gray-300 mb-3">
              person_search
            </span>
            <p className="text-sm text-gray-500">
              {debouncedSearch
                ? 'Nenhum paciente encontrado.'
                : 'Nenhum paciente cadastrado ainda.'}
            </p>
          </div>
        )}

        {allPatients.map((patient) => (
          <PatientRow
            key={patient.id}
            patient={patient}
            onEdit={handleEdit}
            onDelete={handleDeleteRequest}
            onSelect={onSelect}
          />
        ))}

        {isFetchingNextPage && <SkeletonRow />}

        {/* Sentinel for infinite scroll */}
        <div ref={sentinelRef} className="h-1" aria-hidden="true" />
      </div>

      {/* Modals */}
      {editingPatient && (
        <PatientFormModal
          mode="edit"
          patient={editingPatient}
          onClose={() => setEditingPatient(null)}
        />
      )}

      {deletingPatient && (
        <DeletePatientConfirm
          patient={deletingPatient}
          onConfirm={() => deleteMutation.mutate(deletingPatient.id)}
          onCancel={() => setDeletingPatient(null)}
          isPending={deleteMutation.isPending}
          error={deleteMutation.isError ? (deleteMutation.error as Error).message : null}
        />
      )}
    </div>
  );
}
