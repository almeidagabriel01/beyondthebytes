import type { PatientResponse } from '@medschedule/shared';
import { API_BASE, handleResponse } from '@/lib/api-client';

export async function fetchPatient(id: string): Promise<PatientResponse> {
  const res = await fetch(`${API_BASE}/patients/${id}`, { credentials: 'include' });
  return handleResponse<PatientResponse>(res);
}

export async function deletePatient(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/patients/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok && res.status !== 204) {
    let message = `Erro ${res.status}`;
    try {
      const body = (await res.json()) as unknown;
      if (body !== null && typeof body === 'object' && 'message' in body) {
        const m = (body as Record<string, unknown>).message;
        if (typeof m === 'string') message = m;
      }
    } catch {
      // ignore
    }
    throw Object.assign(new Error(message), { status: res.status });
  }
}
