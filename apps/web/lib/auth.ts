import type { MeResponse } from '@medschedule/shared';
import { clientEnv } from '@/lib/env';

/**
 * Fetch the currently authenticated user from /auth/me.
 *
 * On 401 (session expired / cookie invalid) this redirects to /login with the
 * current pathname preserved as ?redirect, then throws — the calling component
 * is unmounting anyway, but the throw keeps react-query in an error state until
 * navigation completes.
 */
export async function fetchMe(): Promise<MeResponse> {
  const res = await fetch(`${clientEnv.NEXT_PUBLIC_API_URL}/auth/me`, {
    credentials: 'include',
  });
  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      const redirect = encodeURIComponent(window.location.pathname);
      window.location.href = `/login?redirect=${redirect}`;
    }
    throw new Error('Session expired');
  }
  if (!res.ok) throw new Error('Not authenticated');
  return res.json() as Promise<MeResponse>;
}

/**
 * Revoke server-side refresh tokens and clear auth cookies.
 *
 * The endpoint returns 204 on success. We swallow non-2xx as a hard failure
 * because the callers always navigate to /login on either branch (server
 * state will be reconciled on next login).
 */
export async function logout(): Promise<void> {
  const res = await fetch(`${clientEnv.NEXT_PUBLIC_API_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok && res.status !== 204) {
    throw new Error('Logout failed');
  }
}
