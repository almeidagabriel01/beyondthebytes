import type { PatientResponse } from '@medschedule/shared';
import { clientEnv } from '@/lib/env';

const BASE = clientEnv.NEXT_PUBLIC_API_URL;

async function handleResponse<T>(res: Response): Promise<T> {
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

export async function fetchPatient(id: string): Promise<PatientResponse> {
  const res = await fetch(`${BASE}/patients/${id}`, { credentials: 'include' });
  return handleResponse<PatientResponse>(res);
}

export async function deletePatient(id: string): Promise<void> {
  const res = await fetch(`${BASE}/patients/${id}`, {
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
