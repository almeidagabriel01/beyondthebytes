import type {
  DashboardTodayResponse,
  DashboardKpisResponse,
  KpisPeriod,
} from '@medschedule/shared';
import { clientEnv } from '@/lib/env';

const BASE = clientEnv.NEXT_PUBLIC_API_URL;

async function handle<T>(res: Response): Promise<T> {
  if (res.ok) return res.json() as Promise<T>;
  throw Object.assign(new Error(`Erro ${res.status}`), { status: res.status });
}

export async function fetchDashboardToday(init?: RequestInit): Promise<DashboardTodayResponse> {
  const res = await fetch(`${BASE}/dashboard/today`, { credentials: 'include', ...init });
  return handle<DashboardTodayResponse>(res);
}

export async function fetchDashboardKpis(
  period: KpisPeriod,
  init?: RequestInit,
): Promise<DashboardKpisResponse> {
  const qs = new URLSearchParams({ period });
  const res = await fetch(`${BASE}/dashboard/kpis?${qs}`, { credentials: 'include', ...init });
  return handle<DashboardKpisResponse>(res);
}
