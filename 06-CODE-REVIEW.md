# Phase 6 Code Review — 2026-05-21

Scope: commits `b490a6f` (T1) through `f9d03f4` (T15). Focus on Dashboard module, Notes module, shared schemas, and web layer (Tiptap editor, NotesModal, dashboard page).

## Coverage Summary

Ran `npx jest --coverage --testPathPattern="(dashboard|notes)\.service\.spec\.ts"` in `apps/api`. 17/17 tests pass.

- `apps/api/src/modules/dashboard/dashboard.service.ts` — **100%** stmts / 100% branch / 100% funcs / 100% lines
- `apps/api/src/modules/notes/notes.service.ts` — **100%** stmts / 100% branch / 100% funcs / 100% lines

Controllers (`dashboard.controller.ts`, `notes.controller.ts`) and module wiring are thin pass-throughs around the services and are exercised indirectly through services (no dedicated controller specs — acceptable for this layer).

## Threats Verified

### T1 — IDOR on notes — **PASS**

- `NotesService.listByAppointment` calls `assertAppointmentAccessible(appointmentId, userId)` first (`apps/api/src/modules/notes/notes.service.ts:38`). The scoping query at line 110-114 filters by `{ id: appointmentId, userId }`, returning 404 when the appointment is not owned by the caller — same shape as a non-existent resource (no resource-disclosure leakage).
- `NotesService.create` calls the same guard at line 54.
- `NotesService.addRevision` reads the note then enforces `existing.authorId !== callerId` → `ForbiddenException` at line 87–89. `authorId` is immutable (never written outside `create`), so the read-before-transaction pattern is safe (no TOCTOU surface).
- Unit tests cover all three branches: not found, wrong user, success.

### T2 — XSS in editor output — **PASS**

- `NoteViewer` (`apps/web/components/notes/note-viewer.tsx`) renders via Tiptap's `<EditorContent>` in non-editable mode. ProseMirror reconstructs the DOM from the JSON tree, never interpreting HTML strings. No `dangerouslySetInnerHTML`.
- `NoteEditor` (editing mode) also uses `<EditorContent>`. No `dangerouslySetInnerHTML`.
- `NoteHistoryDrawer` renders the current revision through `NoteViewer` and prior revisions through `previewText()` (`note-history-drawer.tsx:19-34`) which only concatenates the `text` property of nodes whose `type === 'text'` and renders the result as a React text child (escaped by React). No `dangerouslySetInnerHTML`.
- Global grep across `apps/web/components/{notes,dashboard}` confirms zero `dangerouslySetInnerHTML`.

### T3 — Note creation gated by REALIZADO status — **PASS**

- `NotesService.create` (`notes.service.ts:55`) throws `UnprocessableEntityException` with body `{ code: 'NOTE_REQUIRES_REALIZADO', message: ... }` when `appt.status !== AppointmentStatus.REALIZADO`. Five non-REALIZADO statuses (AGENDADO/CONFIRMADO/AGUARDANDO/EM_ATENDIMENTO/CANCELADO) are all rejected.
- Verified by spec `notes.service.spec.ts:97-108`.
- `addRevision` does NOT re-check status. This is correct because REALIZADO is terminal (`packages/shared/src/domain/appointment-status.ts:38`; `canTransition` does not allow exit from REALIZADO except none), so once a note exists, the appointment's status cannot leave REALIZADO.
- Frontend wiring in `appointment-detail-client.tsx` only renders the "Abrir editor" button under `appt.status === 'REALIZADO'` — defense in depth (server is the gate).

### T4 — Input validation (Tiptap doc shape) — **PASS**

- `TiptapDocSchema` (`packages/shared/src/schemas/clinical-note.ts:4-9`) uses `z.literal('doc')` for the top-level `type`. A payload `{ type: 'evil' }` fails Zod at the controller's `ZodValidationPipe` before reaching the service.
- `CreateClinicalNoteSchema` and `UpdateClinicalNoteSchema` both wrap `content: TiptapDocSchema`.
- Both controller handlers (`notes.controller.ts:25,34`) attach the pipe to the `@Body()` param.

  Note: inner content nodes are typed as `z.array(z.unknown()).optional()` with `.passthrough()`, so arbitrary keys inside nodes are accepted. This is acceptable because rendering goes through ProseMirror, which only honours nodes registered with its schema (StarterKit + Heading + Blockquote). Persisting unknown attributes is a defense-in-depth concern, not a vuln (see Findings → MEDIUM).

### T5 — SQL injection / Prisma misuse — **PASS**

- Grep across `apps/api/src/modules/{dashboard,notes}` for `$queryRaw` / `$executeRaw` → **zero matches**.
- All queries (`appointment.findFirst`, `findMany`, `groupBy`, `count`, `clinicalNote.create`, `findFirst`, `findMany`, `update`, `clinicalNoteRevision.create`) use the parameterized Prisma Client API. `userId` filters are passed as values in `where`, never interpolated into strings.
- `dashboard.service.ts:99-123` and `:143-147` all use object-literal `where` clauses with type-safe Prisma inputs.

### T6 — Race conditions on addRevision — **PASS (best-effort)**

- Two concurrent PATCHes from the same author both pass authz (read of `existing.authorId` matches both times), and both insert a row in `ClinicalNoteRevision` inside `prisma.$transaction`. There is no unique constraint on `(noteId, createdAt)` — concurrent inserts cannot conflict. Both transactions also issue `clinicalNote.update({ data: {} })`, which Prisma compiles to `UPDATE ... SET "updatedAt" = NOW() WHERE id = $1` — both updates apply; the second wins on `updatedAt`. Outcome: two revisions persisted, latest `updatedAt` reflects the last commit. Matches the desired behavior.
- The authz read is outside the transaction, but `authorId` is immutable (never written outside `create`) so there is no TOCTOU window.

### T7 — Tiptap setContent and editor identity — **PASS**

- `NoteEditor` (`apps/web/components/notes/note-editor.tsx`) has a `useEffect` (lines 56–63) that watches `initialContent`, serializes both old and new to JSON for comparison via `lastAppliedRef`, and calls `editor.commands.setContent(next, { emitUpdate: false })` only when the content actually changes. This prevents update-loop feedback into `onChange`.
- `NotesModal` (`notes-modal.tsx:103-110`) renders `<NoteEditor>` only when `notesQuery.isSuccess`, keyed by ``${currentNote?.id ?? 'new'}:${currentNote?.revisions[0]?.id ?? 'fresh'}`` (line 59) — forcing remount when the note or revision identity changes. This eliminates the stale-content-on-late-load bug.
- `draftRef` is seeded by a `useEffect` whose dependency is `currentNote` (lines 36–38), so save() ships the loaded content even if the user opens-and-immediately-saves without typing.

## Findings

### CRITICAL
(none)

### HIGH
(none)

### MEDIUM

- **M1 — `TiptapDocSchema` inner-node validation is permissive.** `content: z.array(z.unknown()).optional()` with `.passthrough()` means arbitrary keys inside a node (`marks`, `attrs`, unknown `type` strings) are accepted by Zod and persisted as-is in JSONB. ProseMirror filters unknown nodes at render time, so this is not exploitable today, but it allows storing junk that bloats the row. **Suggestion**: in a follow-up, narrow `content` to an enumerated set of allowed `type` values (`paragraph`, `heading`, `bulletList`, `orderedList`, `listItem`, `blockquote`, `text`, `hardBreak`) with bounded recursion depth. Not phase-blocking.
- **M2 — `lib/dashboard.ts` error handler is thinner than `lib/notes.ts`.** `lib/dashboard.ts:10-13` throws `Erro ${res.status}` without attempting to parse the server body, so users only see generic "Erro 500" on the dashboard. Compare with `lib/notes.ts:10-26` which extracts the server's `message` field. Inconsistent UX. Easy fix in a future polish pass.

### LOW

- **L1 — `DashboardClient.tsx` builds `buildEmptyByStatus()` on every render.** Minor; not a perf issue but the literal could be hoisted out of the component. Cosmetic.
- **L2 — `dashboard.service.ts` BRT offset is hardcoded.** Comment correctly notes "no DST since 2019". Acceptable; if Brazil ever reinstates DST this becomes a 1-line fix.
- **L3 — `NoteEditor` `toggle()` helper is a no-op wrapper.** `const toggle = (action) => () => action()` adds an indirection without value. Cosmetic.
- **L4 — `notes.service.ts:91` returns the result of a redundant `findFirst` after the transaction.** The `clinicalNote.update({ data: {} })` could `include: REVISIONS_INCLUDE` and return the updated row in one round trip instead of two. Cosmetic perf nit; the second findFirst is an indexed PK lookup.

## Recommendations

- Address **M2** in a polish pass so dashboard errors include server messages (consistent with notes client).
- Consider **M1** as a hardening follow-up if richer editor features (e.g. images, custom marks) are ever added — at that point, an allowlist becomes essential.
- Add lightweight controller specs (`notes.controller.spec.ts`, `dashboard.controller.spec.ts`) using `Test.createTestingModule` to lock down `@CurrentUser()` wiring and `ZodValidationPipe` integration. Not required for this phase.

## Verdict

**APPROVED**

All seven threats (T1–T7) are verified PASS in the implementation. Both services have 100% line/branch/function coverage. No CRITICAL or HIGH findings. Two MEDIUM and four LOW findings are non-blocking polish items.
