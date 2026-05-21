import type {
  DashboardTodayResponse,
  DashboardKpisResponse,
  KpisPeriod,
} from '@medschedule/shared';
import { API_BASE, handleResponse } from '@/lib/api-client';

export async function fetchDashboardToday(init?: RequestInit): Promise<DashboardTodayResponse> {
  const res = await fetch(`${API_BASE}/dashboard/today`, { credentials: 'include', ...init });
  return handleResponse<DashboardTodayResponse>(res);
}

export async function fetchDashboardKpis(
  period: KpisPeriod,
  init?: RequestInit,
): Promise<DashboardKpisResponse> {
  const qs = new URLSearchParams({ period });
  const res = await fetch(`${API_BASE}/dashboard/kpis?${qs}`, { credentials: 'include', ...init });
  return handleResponse<DashboardKpisResponse>(res);
}
