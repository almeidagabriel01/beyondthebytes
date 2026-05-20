export const CLINIC_START_HOUR = 7;
export const CLINIC_LAST_SLOT_HOUR = 18;
export const CLINIC_LAST_SLOT_MINUTE = 30;
export const SLOT_MINUTES = 30;
export const SLOT_DURATION_OPTIONS = [30, 45, 60] as const;
export type SlotDuration = (typeof SLOT_DURATION_OPTIONS)[number];

const TIMEZONE = 'America/Sao_Paulo';

// Returns "HH:MM:SS" string for a date in America/Sao_Paulo
function toBRTString(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

function toBRT(date: Date): { hour: number; minute: number; second: number } {
  const str = toBRTString(date); // e.g. "07:30:00" or "24:00:00"
  const parts = str.split(':');
  return {
    hour: parseInt(parts[0] ?? '0', 10) % 24,
    minute: parseInt(parts[1] ?? '0', 10),
    second: parseInt(parts[2] ?? '0', 10),
  };
}

/**
 * Returns true if the Date represents a valid 30-min slot in BRT:
 * - minutes must be 0 or 30, seconds/ms must be 0
 * - hour range 07:00 to 18:30 inclusive
 */
export function isValidSlot(date: Date): boolean {
  if (date.getMilliseconds() !== 0) return false;
  const { hour, minute, second } = toBRT(date);
  if (second !== 0) return false;
  if (minute !== 0 && minute !== 30) return false;
  const totalMinutes = hour * 60 + minute;
  const start = CLINIC_START_HOUR * 60;
  const end = CLINIC_LAST_SLOT_HOUR * 60 + CLINIC_LAST_SLOT_MINUTE;
  return totalMinutes >= start && totalMinutes <= end;
}

/**
 * Returns true if `date` is strictly after `now`.
 */
export function isFutureSlot(date: Date, now: Date = new Date()): boolean {
  return date.getTime() > now.getTime();
}

const TERMINAL_STATUSES = new Set(['CANCELADO', 'REALIZADO']);

/**
 * Returns available start slots for `date` given existing appointments.
 * durationMinutes: desired duration (default 30). A slot is available only if
 * the entire window [slot, slot+duration) has no overlap with active appointments.
 */
export function getOpenSlots(
  date: Date,
  existingAppointments: Array<{ startsAt: Date; endsAt: Date; status: string }>,
  durationMinutes = 30,
): Date[] {
  const dateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date); // YYYY-MM-DD

  const allSlots: Date[] = [];
  for (let h = CLINIC_START_HOUR; h <= CLINIC_LAST_SLOT_HOUR; h++) {
    for (const m of [0, 30]) {
      const totalMin = h * 60 + m;
      const lastSlotStart = CLINIC_LAST_SLOT_HOUR * 60 + CLINIC_LAST_SLOT_MINUTE;
      if (totalMin > lastSlotStart) break;
      const hh = h < 10 ? '0' + h : String(h);
      const mm = m === 0 ? '00' : '30';
      allSlots.push(new Date(`${dateStr}T${hh}:${mm}:00-03:00`));
    }
  }

  const active = existingAppointments.filter((a) => !TERMINAL_STATUSES.has(a.status));

  return allSlots.filter((slot) => {
    const slotEnd = new Date(slot.getTime() + durationMinutes * 60_000);
    return !active.some((a) => slot < a.endsAt && slotEnd > a.startsAt);
  });
}

/**
 * Formats a Date as "HH:mm" in America/Sao_Paulo timezone.
 */
export function formatSlotTime(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}
