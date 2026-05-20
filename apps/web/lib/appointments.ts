import type {
  CreateAppointment,
  CancelAppointment,
  AppointmentResponse,
  MonthSummaryItem,
} from '@medschedule/shared';
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
  throw Object.assign(new Error(`Request failed with status ${res.status}`), {
    status: res.status,
    body,
  });
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export async function fetchMonthSummary(
  year: number,
  month: number,
  init?: RequestInit,
): Promise<MonthSummaryItem[]> {
  const from = toYMD(new Date(year, month - 1, 1));
  const to = toYMD(new Date(year, month, 0));
  const qs = new URLSearchParams({ from, to });
  const res = await fetch(`${BASE}/appointments/month-summary?${qs}`, {
    credentials: 'include',
    ...init,
  });
  return handleResponse<MonthSummaryItem[]>(res);
}

export async function fetchDayAppointments(
  date: string,
  init?: RequestInit,
): Promise<AppointmentResponse[]> {
  const qs = new URLSearchParams({ date });
  const res = await fetch(`${BASE}/appointments?${qs}`, {
    credentials: 'include',
    ...init,
  });
  return handleResponse<AppointmentResponse[]>(res);
}

export async function createAppointment(dto: CreateAppointment): Promise<AppointmentResponse> {
  const res = await fetch(`${BASE}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(dto),
  });
  return handleResponse<AppointmentResponse>(res);
}

export async function cancelAppointment(
  id: string,
  dto: CancelAppointment,
): Promise<AppointmentResponse> {
  const res = await fetch(`${BASE}/appointments/${id}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(dto),
  });
  return handleResponse<AppointmentResponse>(res);
}
