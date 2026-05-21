# 05-SECURITY.md — Phase 5 Security Audit

**Phase:** 5 — FSM-Gated Status Transitions (Appointments)
**Audit mode:** Retroactive STRIDE
**ASVS Level:** 2
**Date:** 2026-05-20
**Auditor:** Claude Code (claude-sonnet-4-6)
**block_on:** critical

---

## Scope

Phase 5 introduced FSM-controlled appointment status transitions:

- `POST /appointments/:id/transition` — arbitrary target status
- `POST /appointments/:id/advance` — next sequential status
- `GET /appointments/:id/events` — audit event log

Supporting files audited:

- `apps/api/src/modules/appointments/transitions.service.ts`
- `apps/api/src/modules/appointments/appointments.controller.ts`
- `apps/api/src/modules/appointments/appointments.service.ts`
- `apps/web/app/(app)/consultas/[id]/page.tsx`
- `apps/web/app/(app)/consultas/[id]/appointment-detail-client.tsx`
- `apps/web/app/(app)/consultas/page.tsx`
- `apps/web/components/appointments/quick-actions-menu.tsx`
- `apps/web/components/appointments/status-actions.tsx`
- `apps/web/lib/appointments.ts`
- `packages/shared/src/domain/appointment-status.ts`
- `packages/shared/src/schemas/appointment.ts`
- `apps/api/src/app.module.ts` (global guards)
- `apps/api/src/modules/auth/strategies/jwt.strategy.ts` (cookie extraction)
- `apps/api/src/modules/auth/auth.controller.ts` (cookie attributes)

---

## STRIDE Threat Register

### S1 — Spoofing: Unauthenticated access to transition endpoints

| Field | Value |
|---|---|
| **Category** | Spoofing |
| **Asset** | POST /appointments/:id/transition, /advance, GET /events |
| **Attack** | Caller omits or forges JWT; accesses another user's appointment |
| **Disposition** | mitigate |
| **Evidence** | `JwtAuthGuard` registered as `APP_GUARD` globally (app.module.ts:60-61). No `@Public()` decorator on `AppointmentsController` or any of its methods. JWT extracted from `access_token` httpOnly cookie (jwt.strategy.ts:19). `CurrentUser` decorator reads `request.user` set by Passport (current-user.decorator.ts:11-13). `userId` from the validated JWT is passed to every service call. |
| **Status** | CLOSED |

---

### S2 — Spoofing: Cookie forged / stolen via XSS

| Field | Value |
|---|---|
| **Category** | Spoofing |
| **Asset** | `access_token` session cookie |
| **Attack** | Attacker injects script to exfiltrate `access_token` cookie |
| **Disposition** | mitigate |
| **Evidence** | Cookie set with `httpOnly: true` (auth.controller.ts:79). `sameSite: 'lax'` is also set (auth.controller.ts:81). `secure: isProd` ensures HTTPS-only in production (auth.controller.ts:80). `httpOnly` blocks JavaScript access; XSS cannot read the token. |
| **Status** | CLOSED |

---

### T1 — Tampering: FSM bypass by supplying arbitrary `to` status

| Field | Value |
|---|---|
| **Category** | Tampering |
| **Asset** | Appointment status field |
| **Attack** | Caller sends `{"to":"REALIZADO"}` when appointment is `AGENDADO`, skipping intermediate states |
| **Disposition** | mitigate |
| **Evidence** | `TransitionAppointmentSchema` (appointment.ts:46-50) enforces `to` as `AppointmentStatusSchema` enum — invalid string values rejected at pipe. `canTransition(from, to)` (transitions.service.ts:32) checks the TRANSITIONS map before any DB write. The `/advance` path calls `this.transition()` at line 102, inheriting the same `canTransition` gate. |
| **Status** | CLOSED |

---

### T2 — Tampering: TOCTOU race on `/transition` (optimistic lock)

| Field | Value |
|---|---|
| **Category** | Tampering |
| **Asset** | Appointment status integrity under concurrent requests |
| **Attack** | Two concurrent requests both read `AGENDADO`, both pass `canTransition`, second write silently overwrites first |
| **Disposition** | mitigate |
| **Evidence** | `tx.appointment.update({ where: { id, status: from } })` (transitions.service.ts:47-65) — the `status: from` predicate in WHERE acts as a compare-and-swap. Prisma P2025 on zero-row match is caught and re-thrown as `ConflictException` with code `STATUS_CONFLICT`. |
| **Status** | CLOSED |

---

### T3 — Tampering: TOCTOU race on `/cancel` (optimistic lock)

| Field | Value |
|---|---|
| **Category** | Tampering |
| **Asset** | Cancel operation — may overwrite a concurrently realized appointment |
| **Attack** | Request A advances appointment to `REALIZADO`; concurrent Request B (cancel) passes `isTerminal` check on stale state and writes `CANCELADO` over a completed appointment |
| **Disposition** | mitigate |
| **Evidence** | `appointments.service.ts:281`: `update({ where: { id, userId, status: existing.status } })` — `status: existing.status` acts as a compare-and-swap predicate. Lines 291-298: `.catch` block catches `Prisma.PrismaClientKnownRequestError` with `e.code === 'P2025'` (zero-row match) and throws `ConflictException({ code: 'STATUS_CONFLICT' })`, matching the pattern in `transitions.service.ts`. A concurrent FSM advance that changes status between the read and write will cause the update to match zero rows, triggering P2025, which is caught and returned as HTTP 409. |
| **Closed on** | 2026-05-20 |
| **Status** | CLOSED |

---

### T4 — Tampering: Reason field injection / oversized payload

| Field | Value |
|---|---|
| **Category** | Tampering |
| **Asset** | `cancelReason` stored in DB; `payload.reason` in audit event |
| **Attack** | Attacker sends extremely long or whitespace-only reason to pollute audit log or cause DB error |
| **Disposition** | mitigate |
| **Evidence** | `CancelAppointmentSchema`: `z.string().min(1).max(200)` (appointment.ts:42). `TransitionAppointmentSchema`: `z.string().min(1).max(200).optional()` (appointment.ts:48). Service layer additionally checks `!reason?.trim()` for cancel transitions (transitions.service.ts:39) — catches whitespace-only strings that might technically pass `min(1)` on the raw value. Both layers must agree for a write to proceed. |
| **Status** | CLOSED |

---

### R1 — Repudiation: Transition actions not attributed to a user

| Field | Value |
|---|---|
| **Category** | Repudiation |
| **Asset** | `AppointmentEvent` audit log |
| **Attack** | User denies having performed a status transition; no durable record exists |
| **Disposition** | mitigate |
| **Evidence** | `tx.appointmentEvent.create({ data: { byUserId: userId, ... } })` executes within the same `$transaction` as the appointment update (transitions.service.ts:66-75). If the event write fails, the status update rolls back atomically. `byUserId` is sourced from the JWT-validated `user.id`, not a client-supplied field. `create`, `update`, and `cancel` flows in appointments.service.ts also write events in their transactions (lines 171-183, 245-257, 291-299). |
| **Status** | CLOSED |

---

### R2 — Repudiation: Audit log is mutable at the application layer

| Field | Value |
|---|---|
| **Category** | Repudiation |
| **Asset** | `AppointmentEvent` rows |
| **Attack** | Privileged code path (or future developer) deletes or updates event rows, erasing a transition history |
| **Disposition** | accept |
| **Accepted risk rationale** | No `update` or `delete` call on `appointmentEvent` exists in any audited file. Events are written via `create` only. However, there is no DB-level INSERT-only grant, no row-level trigger preventing UPDATE/DELETE, and no schema immutability constraint visible in the codebase. At ASVS L2, application-layer append-only enforcement is acceptable for a single-clinic non-regulated deployment. This would require escalation for HIPAA or CFM/ANS regulatory scope. |
| **Status** | CLOSED (accepted — see above) |

---

### I1 — Information Disclosure: PHI/PII leak in API error responses

| Field | Value |
|---|---|
| **Category** | Information Disclosure |
| **Asset** | Patient CPF, phone, and appointment data |
| **Attack** | Error or exception response body includes raw DB row or stack trace leaking PHI |
| **Disposition** | mitigate |
| **Evidence** | `AllExceptionsFilter` (all-exceptions.filter.ts) catches all exceptions and returns a normalized `{ code, message, traceId }` structure — raw Prisma error details and stack traces are not forwarded to the client. Pino redact paths in app.module.ts:27-45 suppress `cpf` and `phone` from both request bodies and `res.body[*].patient.*` in logs. |
| **Status** | CLOSED |

---

### I2 — Information Disclosure: SSR cookie forwarding leaks session to API

| Field | Value |
|---|---|
| **Category** | Information Disclosure |
| **Asset** | User session cookie forwarded from Next.js SSR to NestJS API |
| **Attack** | Next.js SSR passes all browser cookies to the internal API fetch; cached response served to wrong user |
| **Disposition** | mitigate |
| **Evidence** | `consultas/[id]/page.tsx:36-40` and `consultas/page.tsx:29-33` both use `cookies().getAll()` to construct the `Cookie:` header — only server-to-server. Both fetches set `cache: 'no-store'` (page.tsx:13,15 and consultas/page.tsx:14), preventing Next.js from caching per-user responses across request boundaries. |
| **Status** | CLOSED |

---

### I3 — Information Disclosure: Appointment ID enumeration

| Field | Value |
|---|---|
| **Category** | Information Disclosure |
| **Asset** | Existence of other users' appointments |
| **Attack** | Attacker guesses or enumerates appointment IDs; GET /appointments/:id returns a different user's data |
| **Disposition** | mitigate |
| **Evidence** | Every fetch in `TransitionsService` and `AppointmentsService` uses `findFirst({ where: { id, userId } })` — a non-match returns `null` and the service throws `NotFoundException` (transitions.service.ts:27-28; appointments.service.ts:119-125). An attacker with a valid session for user A cannot retrieve user B's appointment, even with a known ID. Appointment IDs are Prisma CUIDs (high-entropy, non-sequential). |
| **Status** | CLOSED |

---

### D1 — Denial of Service: Transition endpoint flooded

| Field | Value |
|---|---|
| **Category** | Denial of Service |
| **Asset** | Transition and advance endpoints |
| **Attack** | Attacker sends high-volume requests to POST /appointments/:id/transition |
| **Disposition** | mitigate |
| **Evidence** | `ThrottlerGuard` registered as first `APP_GUARD` (app.module.ts:60) with `{ ttl: 60_000, limit: 100 }` — 100 requests per minute per client globally. Auth endpoints have stricter overrides (`limit: 5`). Transition endpoints inherit the default 100 rpm cap. |
| **Status** | CLOSED |

---

### D2 — Denial of Service: Unbounded event history query

| Field | Value |
|---|---|
| **Category** | Denial of Service |
| **Asset** | GET /appointments/:id/events — in-memory user map build |
| **Attack** | An appointment with thousands of events causes a large `findMany` and an in-memory Set/Map build (transitions.service.ts:117-122) |
| **Disposition** | accept |
| **Accepted risk rationale** | Single-clinic system; realistic maximum events per appointment is in the tens (one per status transition). No pagination is implemented. Acceptable at current scale. Revisit if multi-clinic or high-volume workflow is added. |
| **Status** | CLOSED (accepted — see above) |

---

### E1 — Elevation of Privilege: Low-privilege user performs admin transitions

| Field | Value |
|---|---|
| **Category** | Elevation of Privilege |
| **Asset** | Appointment status transitions |
| **Attack** | STAFF user performs transitions reserved for ADMIN |
| **Disposition** | accept |
| **Accepted risk rationale** | Phase 5 does not implement role-based restrictions on which statuses a role may transition to. `RolesGuard` exists (roles.guard.ts) but is not registered as a global `APP_GUARD` and is not applied to `AppointmentsController`. All transitions are permitted for any authenticated user regardless of role. This is an intentional design choice for the current single-provider clinic model where ADMIN and STAFF are the same practitioner. If multi-role workflows are added in a later phase, role restrictions on `EM_ATENDIMENTO` and `REALIZADO` transitions should be enforced. |
| **Status** | CLOSED (accepted — see above) |

---

### E2 — Elevation of Privilege: Client-side FSM enforcement bypassed

| Field | Value |
|---|---|
| **Category** | Elevation of Privilege |
| **Asset** | `canTransition` client filter in status-actions.tsx and quick-actions-menu.tsx |
| **Attack** | Attacker bypasses UI filter and calls POST /transition directly with an invalid target status |
| **Disposition** | mitigate |
| **Evidence** | Client-side `canTransition` filtering is UI-only. Server-side: `ZodValidationPipe(TransitionAppointmentSchema)` rejects unknown enum values at the controller boundary; `canTransition(from, to)` in `transitions.service.ts:32` performs the authoritative FSM check server-side. A direct API call cannot bypass the FSM gate. |
| **Status** | CLOSED |

---

## Verdict

| Threats Closed | Threats Open | ASVS Level | Result |
|---|---|---|---|
| 12/12 | 0/12 | 2 | **SECURED** |

---

## Accepted Risks Log

| ID | Threat | Rationale | Review Trigger |
|---|---|---|---|
| AR-1 | R2 — Audit log DB-level immutability | Application-layer append-only is sufficient for ASVS L2 single-clinic deployment. No regulatory mandate (HIPAA/CFM/ANS) currently in scope. | Regulatory scope change or multi-tenant expansion |
| AR-2 | D2 — Unbounded event history query | Single clinic; max events per appointment is O(10). No pagination needed at current scale. | Multi-clinic or high-volume workflow |
| AR-3 | E1 — No role-based transition restrictions | Single-provider model; ADMIN and STAFF are the same practitioner. RolesGuard exists but is intentionally not applied. | Multi-role or delegation workflow added |

---

## Informational Observations (non-blocking)

1. **`@Param('id')` is not validated as CUID/UUID format.** No `ParseUUIDPipe` or regex check on route parameters. Prisma `findFirst` returns `null` on garbage input (e.g., SQL-injection attempt), so `NotFoundException` is thrown safely. No security gap — hardening only.

2. **Failed transitions produce no audit event.** FSM rejection, whitespace-only reason rejection, and P2025 conflicts all throw without writing an `AppointmentEvent`. Successful actions only are audited. Acceptable for ASVS L2; would need revisiting if forensic tracing of attempted unauthorized transitions is required.

3. **CSRF mitigated by `sameSite: 'lax'`** on the `access_token` cookie (auth.controller.ts:81). Cross-origin POST requests from a third-party origin will not carry the cookie. `sameSite: strict` would be stronger but `lax` is adequate for a top-level navigation workflow.

4. **Transition optimistic lock does not include `userId`** in the update WHERE (transitions.service.ts:49: `where: { id, status: from }`). Tenant isolation relies on the prior `findFirst({ where: { id, userId } })`. This is sound because appointment IDs are high-entropy CUIDs (no enumeration risk), but defense-in-depth would add `userId` to the update WHERE to make the constraint self-contained.

---

## Audit Trail

| Date | Auditor | Action | Detail |
|---|---|---|---|
| 2026-05-20 | Claude Code (claude-sonnet-4-6) | Initial audit | Phase 5 STRIDE audit. 11/12 threats closed. T3 marked OPEN — BLOCKER: cancel() lacked status predicate and P2025 catch. |
| 2026-05-20 | Claude Code (claude-sonnet-4-6) | T3 re-verification | Confirmed `status: existing.status` in update WHERE (appointments.service.ts:281) and P2025 ConflictException catch (lines 291-298). T3 closed. All 12/12 threats now CLOSED. Phase SECURED. |
