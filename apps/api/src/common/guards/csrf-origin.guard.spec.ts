import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { CsrfOriginGuard } from './csrf-origin.guard';

jest.mock('../../config/env', () => ({
  env: () => ({ CORS_ORIGIN: 'http://localhost:3000,https://app.example.com' }),
}));

function ctx(method: string, headers: Record<string, string> = {}): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ method, headers }) }),
  } as unknown as ExecutionContext;
}

describe('CsrfOriginGuard', () => {
  const guard = new CsrfOriginGuard();

  it('allows GET regardless of origin', () => {
    expect(guard.canActivate(ctx('GET', { origin: 'https://evil.com' }))).toBe(true);
  });

  it('allows POST without origin (server-to-server)', () => {
    expect(guard.canActivate(ctx('POST'))).toBe(true);
  });

  it('allows POST from configured origin', () => {
    expect(guard.canActivate(ctx('POST', { origin: 'http://localhost:3000' }))).toBe(true);
  });

  it('allows POST from second configured origin', () => {
    expect(guard.canActivate(ctx('POST', { origin: 'https://app.example.com' }))).toBe(true);
  });

  it('blocks POST from foreign origin', () => {
    expect(() => guard.canActivate(ctx('POST', { origin: 'https://evil.com' }))).toThrow(
      ForbiddenException,
    );
  });

  it('accepts referer when origin is missing', () => {
    expect(guard.canActivate(ctx('PATCH', { referer: 'http://localhost:3000/dashboard' }))).toBe(
      true,
    );
  });
});
