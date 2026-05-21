import type {
  CreateAppointment,
  UpdateAppointment,
  CancelAppointment,
  AppointmentResponse,
  AppointmentEventResponse,
  AppointmentStatus,
  MonthSummaryItem,
} from '@medschedule/shared';
import { API_BASE, handleResponse } from '@/lib/api-client';

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
  const res = await fetch(`${API_BASE}/appointments/month-summary?${qs}`, {
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
  const res = await fetch(`${API_BASE}/appointments?${qs}`, {
    credentials: 'include',
    ...init,
  });
  return handleResponse<AppointmentResponse[]>(res);
}

export async function fetchHistoryAppointments(
  from: string,
  to: string,
  statuses: AppointmentStatus[],
  init?: RequestInit,
): Promise<AppointmentResponse[]> {
  const qs = new URLSearchParams({
    from,
    to,
    status: statuses.join(','),
    order: 'desc',
  });
  const res = await fetch(`${API_BASE}/appointments?${qs}`, {
    credentials: 'include',
    ...init,
  });
  return handleResponse<AppointmentResponse[]>(res);
}

export async function createAppointment(dto: CreateAppointment): Promise<AppointmentResponse> {
  const res = await fetch(`${API_BASE}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(dto),
  });
  return handleResponse<AppointmentResponse>(res);
}

export async function updateAppointment(
  id: string,
  dto: UpdateAppointment,
): Promise<AppointmentResponse> {
  const res = await fetch(`${API_BASE}/appointments/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(dto),
  });
  return handleResponse<AppointmentResponse>(res);
}

export async function fetchAppointment(id: string): Promise<AppointmentResponse> {
  const res = await fetch(`${API_BASE}/appointments/${id}`, { credentials: 'include' });
  return handleResponse<AppointmentResponse>(res);
}

export async function fetchAppointmentEvents(id: string): Promise<AppointmentEventResponse[]> {
  const res = await fetch(`${API_BASE}/appointments/${id}/events`, { credentials: 'include' });
  return handleResponse<AppointmentEventResponse[]>(res);
}

export async function cancelAppointment(
  id: string,
  dto: CancelAppointment,
): Promise<AppointmentResponse> {
  const res = await fetch(`${API_BASE}/appointments/${id}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(dto),
  });
  return handleResponse<AppointmentResponse>(res);
}

export async function transitionAppointment(
  id: string,
  to: AppointmentStatus,
  reason?: string,
): Promise<{ status: AppointmentStatus }> {
  const res = await fetch(`${API_BASE}/appointments/${id}/transition`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ to, reason }),
  });
  return handleResponse<{ status: AppointmentStatus }>(res);
}
