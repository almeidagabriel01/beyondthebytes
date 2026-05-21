---
phase: 05-appointment-status-fsm
reviewed: 2026-05-20T00:00:00Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - packages/shared/src/domain/appointment-status.ts
  - packages/shared/src/domain/appointment-status.test.ts
  - packages/shared/src/schemas/appointment.ts
  - packages/shared/src/index.ts
  - apps/api/src/modules/appointments/appointments.controller.ts
  - apps/api/src/modules/appointments/appointments.module.ts
  - apps/api/src/modules/appointments/appointments.service.ts
  - apps/api/src/modules/appointments/transitions.service.ts
  - apps/api/src/modules/appointments/transitions.service.spec.ts
  - apps/web/app/(app)/consultas/[id]/page.tsx
  - apps/web/app/(app)/consultas/[id]/appointment-detail-client.tsx
  - apps/web/app/(app)/consultas/page.tsx
  - apps/web/components/agenda/agenda-day.tsx
  - apps/web/components/agenda/agenda-section.tsx
  - apps/web/components/appointments/edit-appointment-modal.tsx
  - apps/web/components/appointments/quick-actions-menu.tsx
  - apps/web/components/appointments/status-actions.tsx
  - apps/web/components/appointments/status-timeline.tsx
  - apps/web/components/calendar/day-panel.tsx
  - apps/web/lib/appointments.ts
findings:
  critical: 3
  warning: 5
  info: 3
  total: 11
status: issues_found
---

# Phase 5: Code Review Report

**Reviewed:** 2026-05-20T00:00:00Z
**Depth:** standard
**Files Reviewed:** 20
**Status:** issues_found

## Summary

Phase 5 introduces a FSM layer (`appointment-status.ts`) for status transitions, three new API endpoints (`POST /transition`, `POST /advance`, `GET /events`), an append-only `AppointmentEvent` audit log, and client surfaces (detail page, quick-action menus, status timeline). The FSM pure functions are correct and well-tested. The main issues fall into three areas:

1. **Audit integrity**: the transition service performs no optimistic locking, so two simultaneous requests can both pass FSM validation and record an `AppointmentEvent` with a stale `fromStatus`.
2. **Date handling**: the web tier computes "today" using the server's local clock without fixing the timezone, breaking the "Consultas de Hoje" list whenever the Node process runs in UTC.
3. **Silent failures**: three action paths swallow errors without surfacing any feedback to the user.

No inline lint suppression violations were found.

---

## Critical Issues

### CR-01: No Optimistic Locking on Status Transition — Stale Audit Log and FSM Bypass

**File:** `apps/api/src/modules/appointments/transitions.service.ts:22-54`

**Issue:** `transition()` reads the current status with `findFirst({where:{id,userId}})`, calls `canTransition(from, to)`, then executes the Prisma transaction with `update({where:{id}, data:{status:to}})`. There is no guard on the status value that was read. Two concurrent requests for the same appointment (e.g., a double-tap or a race between browser tabs) both read status `AGENDADO`, both pass `canTransition('AGENDADO','CONFIRMADO')`, and both write. The second write silently succeeds even though the first already updated the row. The `AppointmentEvent` table is supposed to be an append-only audit trail; this race inserts two `TRANSITIONED` rows both claiming `fromStatus: 'AGENDADO'` — a lie. Worse, a concurrent advance and a manual transition can slip a terminal state past the FSM:

```
t=0: read AGENDADO        t=0: read AGENDADO
t=1: canTransition OK     t=1: canTransition OK  
t=2: write → CONFIRMADO   t=2: write → CANCELADO
audit: AGENDADO→CANCELADO is invalid per FSM but never caught
```

**Fix:** Add `status: from` to the transaction's `update` where-clause. If the row has moved, Prisma throws `P2025` (record not found), which the caller should surface as `409 Conflict`:

```typescript
// inside the $transaction:
await tx.appointment.update({
  where: { id, status: from as PrismaStatus },  // optimistic lock
  data: {
    status: to as PrismaStatus,
    ...(to === 'CANCELADO' ? { cancelledAt: new Date(), cancelReason: reason ?? null } : {}),
  },
});
// caller: catch P2025 → throw new ConflictException({ code: 'CONCURRENT_TRANSITION' })
```

---

### CR-02: Timezone Bug — "Consultas de Hoje" Shows Wrong Day for UTC-Deployed Servers

**File:** `apps/web/app/(app)/consultas/page.tsx:11`

**Issue:** `format(new Date(), 'yyyy-MM-dd')` uses the Node process's local clock, which defaults to UTC in virtually all cloud runtimes (Railway, Fly.io, Vercel serverless, Docker without `TZ` env var). The API treats the `date` parameter as `America/Sao_Paulo` business hours (`T00:00:00-03:00` / `T23:59:59-03:00`, see `appointments.service.ts:91-92`). From 21:00 Sao Paulo time onward (00:00 UTC) `new Date()` returns tomorrow's UTC date, so the list fetches tomorrow's appointments and shows them as "Consultas de Hoje". Neither `.env` nor `.env.example` for either app sets `TZ`.

The same class of bug exists in `lib/appointments.ts:33` where `toYMD` uses `d.getMonth()` and `d.getDate()` — local-TZ getters — so `fetchMonthSummary` will compute wrong first/last day boundaries in UTC environments too.

**Fix:** Force a consistent timezone-aware formatter in both places:

```typescript
// consultas/page.tsx
import { TZDate } from '@date-fns/tz';   // or use date-fns-tz formatInTimeZone
const date = format(new TZDate(new Date(), 'America/Sao_Paulo'), 'yyyy-MM-dd');

// lib/appointments.ts — replace toYMD:
import { formatInTimeZone } from 'date-fns-tz';
function toYMD(d: Date): string {
  return formatInTimeZone(d, 'America/Sao_Paulo', 'yyyy-MM-dd');
}
```

Alternatively, pin `TZ=America/Sao_Paulo` in `apps/web/.env` and both Docker/container configs — but that is fragile across deployment environments.

---

### CR-03: Transition and Advance Errors are Silently Discarded — No User Feedback

**File:** `apps/web/app/(app)/consultas/[id]/appointment-detail-client.tsx:58-73`
**File:** `apps/web/components/appointments/quick-actions-menu.tsx:55-73`

**Issue:** Both `handleTransition` (detail page) and `handleAction` (quick-actions menu) wrap the API call in `try { ... } finally { setLoading(false) }` with no `catch` block. When `transitionAppointment` rejects (network error, 422 INVALID_TRANSITION from a stale UI, 404), the exception propagates as an unhandled promise rejection, the loading spinner resets, and the UI shows nothing. The user has no idea whether the status change succeeded or failed. For a health-record audit context this is particularly dangerous — the clinician believes the record was updated when it was not.

In `appointment-detail-client.tsx` the `router.refresh()` is inside the `try` block after `await transitionAppointment`, so on error even the optimistic page refresh is skipped. Identical structure in `quick-actions-menu.tsx` where `qc.invalidateQueries` is also inside the `try`.

**Fix:** Add an error state and catch:

```typescript
// appointment-detail-client.tsx
const [transitionError, setTransitionError] = useState<string | null>(null);

const handleTransition = useCallback(async (to: AppointmentStatus) => {
  if (to === 'CANCELADO') { setShowCancel(true); return; }
  setTransitioning(true);
  setTransitionError(null);
  try {
    await transitionAppointment(appt.id, to);
    router.refresh();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao atualizar status.';
    setTransitionError(msg);
  } finally {
    setTransitioning(false);
  }
}, [appt.id, router]);

// Render near the footer:
{transitionError && (
  <p role="alert" className="text-sm text-red-600">{transitionError}</p>
)}
```

Apply the same pattern to `quick-actions-menu.tsx` `handleAction`.

---

## Warnings

### WR-01: Cancellation via `/transition` Allows Empty or Missing Reason — Audit Inconsistency

**File:** `packages/shared/src/schemas/appointment.ts:46-50`
**File:** `apps/api/src/modules/appointments/transitions.service.ts:39`

**Issue:** `TransitionAppointmentSchema.reason` is `z.string().min(1).max(200).optional()`, so `POST /appointments/:id/transition` with `{to:"CANCELADO"}` is valid and will set `cancelReason: null` on the appointment. However `POST /appointments/:id/cancel` requires `reason: z.string().min(1)`. The two paths that produce the same terminal state (`CANCELADO`) have inconsistent contracts. An audit reviewer will see some cancellations with no reason recorded and be unable to determine whether it was a system bug.

**Fix:** Add server-side enforcement in `TransitionsService.transition()`:

```typescript
if (to === 'CANCELADO' && !reason?.trim()) {
  throw new UnprocessableEntityException({
    code: 'REASON_REQUIRED',
    message: 'É obrigatório informar o motivo do cancelamento',
  });
}
```

---

### WR-02: Entire DTO Persisted as Audit Payload — Potential PII Leakage into JSONB

**File:** `apps/api/src/modules/appointments/appointments.service.ts:177`
**File:** `apps/api/src/modules/appointments/appointments.service.ts:248`

**Issue:** Both the `create` and `update` event records store `payload: { dto }`, which means the full DTO object (including `observations`, `value`, `insurance`) is persisted verbatim into the `AppointmentEvent.payload` JSONB column. The recent `8dea7d2` commit extended pino redact paths specifically to avoid leaking appointment data in logs — but redaction only covers log output, not database writes. The JSONB column is outside the scope of any column-level encryption or field-level auditing in the current schema.

**Fix:** Use an explicit allowlist for what goes into the audit payload:

```typescript
// CREATED event
payload: {
  type: dto.type,
  durationMinutes: dto.durationMinutes,
  startsAt: dto.startsAt,
} as Prisma.InputJsonValue,

// UPDATED event — record which fields changed, not their values
payload: {
  changedFields: Object.keys(dto),
} as Prisma.InputJsonValue,
```

---

### WR-03: `fetchEvents` Failure Silently Renders as Empty Timeline

**File:** `apps/web/app/(app)/consultas/[id]/page.tsx:21-28`

**Issue:** `fetchEvents` catches any non-ok response with `return []`. A 500 from the API will show the patient as having no audit history (`"Nenhum evento registrado."`), which is both misleading and dangerous in a healthcare audit context. The actual appointment data fetched in the same `Promise.all` correctly throws on failure — this asymmetry means a partial data state is rendered silently.

**Fix:** Throw on non-2xx the same way `fetchAppointment` does, and handle the error at the page level:

```typescript
async function fetchEvents(id: string, cookieHeader: string): Promise<AppointmentEventResponse[]> {
  const res = await fetch(`${API}/appointments/${id}/events`, {
    headers: { Cookie: cookieHeader },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Failed to fetch events: ${res.status}`);
  return res.json() as Promise<AppointmentEventResponse[]>;
}
```

If a degraded-mode (show appointment without events) is required by design, document it explicitly and display a visible warning rather than an empty list.

---

### WR-04: `handleResponse` Error Detail Unreachable by Callers

**File:** `apps/web/lib/appointments.ts:14-26`

**Issue:** `handleResponse` enriches the thrown `Error` with `.status` and `.body` via `Object.assign`, but every caller (`edit-appointment-modal.tsx:63`, `appointment-detail-client.tsx:66`, `quick-actions-menu.tsx` — where there is no catch at all) only accesses `err instanceof Error ? err.message : ...`. The `body` (which contains the NestJS `code` and `message` fields like `INVALID_TRANSITION` or `SLOT_CONFLICT`) is never surfaced. Users see the generic `"Request failed with status 422"` string instead of the structured error message. The `edit-appointment-modal.tsx:64` can at least show the generic message; the transition paths in CR-03 show nothing at all.

**Fix:** Either extend the error class or extract the message from body:

```typescript
async function handleResponse<T>(res: Response): Promise<T> {
  if (res.ok) return res.json() as Promise<T>;
  let body: unknown;
  try { body = await res.json(); } catch { body = await res.text(); }
  const apiMsg =
    typeof body === 'object' && body !== null && 'message' in body
      ? String((body as Record<string, unknown>).message)
      : undefined;
  throw Object.assign(
    new Error(apiMsg ?? `Request failed with status ${res.status}`),
    { status: res.status, body },
  );
}
```

---

### WR-05: `StatusActions` Edit Button Disabled Based on Available-Actions Count, Not `isTerminal`

**File:** `apps/web/components/appointments/status-actions.tsx:40-47`

**Issue:** `isTerminalStatus` is derived as `availableActions.length === 0`, which re-implements the FSM logic already exposed as `isTerminal()` from `@medschedule/shared`. This is redundant but also subtly incorrect: `AGUARDANDO → EM_ATENDIMENTO` is the only available transition for `AGUARDANDO`, so `availableActions.length === 1` — yet the edit button is enabled. That is correct by coincidence. More importantly, the component receives `currentStatus: AppointmentStatus` but the parent (`AppointmentDetailClient`) already computes `const terminal = isTerminal(appt.status)` and passes it as `!terminal` to hide the whole footer. The double-calculation is inconsistent — if these two guards ever diverge (e.g., FSM changes), one will be wrong. The footer is hidden for terminal statuses, so the edit button disable is also redundant.

**Fix:** Import and use `isTerminal` directly:

```typescript
import { canTransition, isTerminal } from '@medschedule/shared';
// ...
const terminal = isTerminal(currentStatus);
// use `terminal` for the edit button disabled prop
```

---

## Info

### IN-01: Status Timeline Highlights Oldest Event, Not Newest

**File:** `apps/web/components/appointments/status-timeline.tsx:50-61`

**Issue:** The blue accent dot is rendered for `idx === 0`. Events are fetched with `orderBy: { createdAt: 'asc' }` (confirmed in `transitions.service.ts:90`) and confirmed in the test at line 202. This means the special visual treatment goes to the `CREATED` (oldest) event, not the most recent action. If the design intent is "highlight the current state", the accent should go to the last entry (`idx === events.length - 1`).

**Fix:**

```typescript
const isLatest = idx === events.length - 1;
// replace all `isFirst` references with `isLatest`
```

---

### IN-02: `patientInitials` Can Return Empty String or Single Char for Edge-Case Names

**File:** `apps/web/app/(app)/consultas/[id]/appointment-detail-client.tsx:27-33`

**Issue:** `w[0]` on a word can be `undefined` if a "word" is an empty string (consecutive spaces in `fullName`). Calling `.toUpperCase()` on `undefined` throws. Also a single-word name (no spaces) produces one character, which looks unbalanced in the avatar circle.

**Fix:**

```typescript
function patientInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();
}
```

---

### IN-03: "Ver todas" Button in `day-panel.tsx` Has No Action

**File:** `apps/web/components/calendar/day-panel.tsx:93-96`

**Issue:** The "Ver todas" button has no `onClick` handler and no `href`. It is a dead UI element that looks interactive but does nothing. Users clicking it will be confused.

**Fix:** Either wire it to navigate to `/consultas?date=${isoDate}` or remove it until the feature is implemented:

```tsx
<Link
  href={`/consultas?date=${isoDate}`}
  className="text-[12px] font-semibold text-[#4648d4] hover:underline"
>
  Ver todas
</Link>
```

---

_Reviewed: 2026-05-20T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
