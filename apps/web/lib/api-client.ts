import { clientEnv } from '@/lib/env';

export const API_BASE = clientEnv.NEXT_PUBLIC_API_URL;

export async function handleResponse<T>(res: Response): Promise<T> {
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
