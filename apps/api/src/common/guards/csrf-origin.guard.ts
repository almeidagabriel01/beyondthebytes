import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { EnvService } from '../../config/env.service';

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * CSRF defense-in-depth: validates the `Origin` (or fallback `Referer`) header
 * against the configured CORS origin allowlist for state-changing requests.
 *
 * Browsers always set `Origin` on cross-site fetches with credentials, so a
 * mismatch is a strong signal of a forged request. Same-origin requests and
 * server-to-server callers without an Origin/Referer are allowed.
 */
@Injectable()
export class CsrfOriginGuard implements CanActivate {
  constructor(private readonly envService: EnvService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    if (!STATE_CHANGING_METHODS.has(req.method)) return true;

    const origin = req.headers.origin ?? req.headers.referer;
    if (!origin) {
      // Server-to-server or same-origin (no browser cross-site context).
      // Browsers always set Origin on cross-site fetches with credentials.
      return true;
    }

    const allowed = this.envService.env.CORS_ORIGIN.split(',')
      .map((o) => o.trim())
      .filter(Boolean);

    // Origin header = scheme://host[:port]; Referer = full URL — match by prefix.
    if (allowed.some((a) => origin === a || origin.startsWith(a + '/'))) {
      return true;
    }

    throw new ForbiddenException({
      code: 'CSRF_ORIGIN_MISMATCH',
      message: 'Invalid request origin',
    });
  }
}
