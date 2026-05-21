import type {
  ClinicalNoteResponse,
  CreateClinicalNote,
  UpdateClinicalNote,
} from '@medschedule/shared';
import { clientEnv } from '@/lib/env';

const BASE = clientEnv.NEXT_PUBLIC_API_URL;

async function handle<T>(res: Response): Promise<T> {
  if (res.ok) return res.json() as Promise<T>;
  let body: unknown;
  try {
    body = (await res.json()) as unknown;
  } catch {
    body = await res.text();
  }
  const message =
    body !== null &&
    typeof body === 'object' &&
    'message' in body &&
    typeof (body as Record<string, unknown>).message === 'string'
      ? (body as { message: string }).message
      : `Erro ${res.status}`;
  throw Object.assign(new Error(message), { status: res.status, body });
}

export async function fetchAppointmentNotes(
  appointmentId: string,
  init?: RequestInit,
): Promise<ClinicalNoteResponse[]> {
  const res = await fetch(`${BASE}/appointments/${appointmentId}/notes`, {
    credentials: 'include',
    ...init,
  });
  return handle<ClinicalNoteResponse[]>(res);
}

export async function createAppointmentNote(
  appointmentId: string,
  dto: CreateClinicalNote,
): Promise<ClinicalNoteResponse> {
  const res = await fetch(`${BASE}/appointments/${appointmentId}/notes`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return handle<ClinicalNoteResponse>(res);
}

export async function patchClinicalNote(
  noteId: string,
  dto: UpdateClinicalNote,
): Promise<ClinicalNoteResponse> {
  const res = await fetch(`${BASE}/notes/${noteId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return handle<ClinicalNoteResponse>(res);
}
