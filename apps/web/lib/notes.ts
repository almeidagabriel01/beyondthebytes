import type {
  ClinicalNoteResponse,
  CreateClinicalNote,
  UpdateClinicalNote,
} from '@medschedule/shared';
import { API_BASE, handleResponse } from '@/lib/api-client';

export async function fetchAppointmentNotes(
  appointmentId: string,
  init?: RequestInit,
): Promise<ClinicalNoteResponse[]> {
  const res = await fetch(`${API_BASE}/appointments/${appointmentId}/notes`, {
    credentials: 'include',
    ...init,
  });
  return handleResponse<ClinicalNoteResponse[]>(res);
}

export async function createAppointmentNote(
  appointmentId: string,
  dto: CreateClinicalNote,
): Promise<ClinicalNoteResponse> {
  const res = await fetch(`${API_BASE}/appointments/${appointmentId}/notes`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return handleResponse<ClinicalNoteResponse>(res);
}

export async function patchClinicalNote(
  noteId: string,
  dto: UpdateClinicalNote,
): Promise<ClinicalNoteResponse> {
  const res = await fetch(`${API_BASE}/notes/${noteId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return handleResponse<ClinicalNoteResponse>(res);
}
