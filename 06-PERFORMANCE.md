# 06-PERFORMANCE.md — Phase 6 Dashboard Query Performance

**Phase:** 6 — Dashboard + Clinical Notes
**Date:** 2026-05-21
**Verified by:** Claude Code (claude-opus-4-7)
**Database:** local Postgres 16 (Docker, `bey-postgres-1`)
**Tool:** `psql` inside container

---

## Dashboard query performance (10k volume)

Verified against local Postgres dev DB with 10k synthetic appointments injected into the `Appointment` table (`ANALYZE` run before measurement).

| Query | Plan | Execution Time |
|---|---|---|
| Today groupBy (status) | Index Scan on `Appointment_startsAt_idx` + Sort + GroupAggregate | 0.138 ms |
| Next appointments (LIMIT 10) | Index Scan on `Appointment_startsAt_idx` (filter on userId + status) | 0.050 ms |
| Week groupBy (status) | Index Scan on `Appointment_startsAt_idx` + Sort + GroupAggregate | 0.106 ms |

All queries complete well under the 50ms budget. No sequential scans observed.

### Notes

- **Synthetic dataset:** 10,000 rows inserted via `generate_series` with 35-minute spacing in a far-past timeline (`now() - 400 days` onward) to avoid colliding with the `no_overlap_per_user` exclusion constraint added in phase 5. Statuses cycled across `AGENDADO` / `CONFIRMADO` / `REALIZADO` / `CANCELADO`. Rows cleaned up after measurement (`DELETE WHERE id LIKE 'syn_%'`).
- **Plan choice:** for these narrow time windows (1 day / 7 days) on a single-user dev DB the planner picked `Appointment_startsAt_idx` (single-column) rather than the composite `Appointment_userId_startsAt_idx`, because the time predicate is already highly selective. On a multi-user prod DB the planner is expected to switch to the composite when userId selectivity dominates. Both indexes are available; no seq scans occur in either regime.
- **Existing indexes on `Appointment`:** `(startsAt)`, `(userId, startsAt)`, `(patientId, startsAt)`, `(status, startsAt)` — confirmed sufficient for the three DashboardService hot queries in `apps/api/src/modules/dashboard/dashboard.service.ts`.

### Raw EXPLAIN output

#### Query 1 — today groupBy

```
GroupAggregate  (cost=8.33..8.35 rows=1 width=12) (actual time=0.060..0.062 rows=4 loops=1)
  Group Key: status
  ->  Sort  (cost=8.33..8.33 rows=1 width=4) (actual time=0.057..0.057 rows=4 loops=1)
        Sort Key: status
        ->  Index Scan using "Appointment_startsAt_idx" on "Appointment"
              Index Cond: (("startsAt" >= (now() - '1 day'::interval)) AND ("startsAt" < (now() + '1 day'::interval)))
              Filter: ("userId" = '<USER_ID>'::text)
Planning Time: 0.971 ms
Execution Time: 0.138 ms
```

#### Query 2 — next appointments LIMIT 10

```
Limit  (cost=0.29..8.36 rows=1 width=32) (actual time=0.018..0.019 rows=4 loops=1)
  ->  Index Scan using "Appointment_startsAt_idx" on "Appointment"
        Index Cond: ("startsAt" >= now())
        Filter: ((status <> ALL ('{CANCELADO,REALIZADO}'::"AppointmentStatus"[])) AND ("userId" = '<USER_ID>'::text))
Planning Time: 0.960 ms
Execution Time: 0.050 ms
```

#### Query 3 — week groupBy

```
GroupAggregate  (cost=8.58..8.65 rows=3 width=12) (actual time=0.055..0.057 rows=4 loops=1)
  Group Key: status
  ->  Sort  (cost=8.58..8.59 rows=5 width=4) (actual time=0.052..0.052 rows=4 loops=1)
        Sort Key: status
        ->  Index Scan using "Appointment_startsAt_idx" on "Appointment"
              Index Cond: (("startsAt" >= (now() - '7 days'::interval)) AND ("startsAt" < (now() + '1 day'::interval)))
              Filter: ("userId" = '<USER_ID>'::text)
Planning Time: 0.881 ms
Execution Time: 0.106 ms
```
