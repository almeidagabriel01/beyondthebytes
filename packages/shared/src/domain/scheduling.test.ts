import {
  isValidSlot,
  isFutureSlot,
  getOpenSlots,
  formatSlotTime,
  SLOT_DURATION_OPTIONS,
} from './scheduling';

// Helper: build a Date for a given BRT hour:minute on 2026-06-15
function pad(n: number): string {
  return n < 10 ? '0' + n : String(n);
}
function d(hour: number, minute: number): Date {
  return new Date(`2026-06-15T${pad(hour)}:${pad(minute)}:00-03:00`);
}

describe('isValidSlot', () => {
  it('07:00 BRT is valid', () => expect(isValidSlot(d(7, 0))).toBe(true));
  it('07:30 BRT is valid', () => expect(isValidSlot(d(7, 30))).toBe(true));
  it('18:30 BRT is valid — last slot', () => expect(isValidSlot(d(18, 30))).toBe(true));
  it('19:00 BRT is invalid — after last slot', () => expect(isValidSlot(d(19, 0))).toBe(false));
  it('06:30 BRT is invalid — before opening', () => expect(isValidSlot(d(6, 30))).toBe(false));
  it('09:15 BRT is invalid — not a 30-min multiple', () =>
    expect(isValidSlot(d(9, 15))).toBe(false));
  it('09:01 BRT is invalid — 1 minute off', () => expect(isValidSlot(d(9, 1))).toBe(false));
  it('seconds must be 0', () => {
    const dt = new Date('2026-06-15T09:00:05-03:00');
    expect(isValidSlot(dt)).toBe(false);
  });
  it('00:00 is invalid', () => expect(isValidSlot(d(0, 0))).toBe(false));
});

describe('isFutureSlot', () => {
  const now = new Date('2026-06-15T10:00:00Z');

  it('tomorrow is future', () => {
    expect(isFutureSlot(new Date('2026-06-16T10:00:00Z'), now)).toBe(true);
  });
  it('yesterday is not future', () => {
    expect(isFutureSlot(new Date('2026-06-14T10:00:00Z'), now)).toBe(false);
  });
  it('exactly now is not future', () => {
    expect(isFutureSlot(now, now)).toBe(false);
  });
  it('1 ms ahead is future', () => {
    expect(isFutureSlot(new Date(now.getTime() + 1), now)).toBe(true);
  });
  it('uses real now when not provided', () => {
    expect(isFutureSlot(new Date('2099-01-01T10:00:00Z'))).toBe(true);
  });
});

describe('getOpenSlots', () => {
  const date = new Date('2026-06-15T00:00:00-03:00');

  it('returns 24 slots when no appointments', () => {
    const slots = getOpenSlots(date, []);
    expect(slots).toHaveLength(24);
  });

  it('first slot is 07:00 BRT', () => {
    const slots = getOpenSlots(date, []);
    expect(formatSlotTime(slots[0]!)).toBe('07:00');
  });

  it('last slot is 18:30 BRT', () => {
    const slots = getOpenSlots(date, []);
    expect(formatSlotTime(slots[slots.length - 1]!)).toBe('18:30');
  });

  it('removes slot occupied by AGENDADO appointment (30 min)', () => {
    const appt = { startsAt: d(9, 0), endsAt: d(9, 30), status: 'AGENDADO' };
    const slots = getOpenSlots(date, [appt], 30);
    expect(slots.some((s) => formatSlotTime(s) === '09:00')).toBe(false);
    expect(slots).toHaveLength(23);
  });

  it('CANCELADO appointment does NOT block slot', () => {
    const appt = { startsAt: d(9, 0), endsAt: d(9, 30), status: 'CANCELADO' };
    expect(getOpenSlots(date, [appt], 30)).toHaveLength(24);
  });

  it('REALIZADO appointment does NOT block slot', () => {
    const appt = { startsAt: d(9, 0), endsAt: d(9, 30), status: 'REALIZADO' };
    expect(getOpenSlots(date, [appt], 30)).toHaveLength(24);
  });

  it('60-min appointment blocks 2 consecutive slots', () => {
    const appt = { startsAt: d(9, 0), endsAt: d(10, 0), status: 'AGENDADO' };
    const slots = getOpenSlots(date, [appt], 30);
    expect(slots.some((s) => formatSlotTime(s) === '09:00')).toBe(false);
    expect(slots.some((s) => formatSlotTime(s) === '09:30')).toBe(false);
    expect(slots).toHaveLength(22);
  });

  it('requesting 60-min duration removes slots where window is not free', () => {
    // block 09:30
    const appt = { startsAt: d(9, 30), endsAt: d(10, 0), status: 'AGENDADO' };
    const slots = getOpenSlots(date, [appt], 60);
    // 09:00 would need 09:00–10:00, but 09:30 is blocked → not available
    expect(slots.some((s) => formatSlotTime(s) === '09:00')).toBe(false);
    // 10:00 onward with 60-min window should still be available (if free)
    expect(slots.some((s) => formatSlotTime(s) === '10:00')).toBe(true);
  });
});

describe('formatSlotTime', () => {
  it('formats 07:00 BRT correctly', () => {
    expect(formatSlotTime(new Date('2026-06-15T07:00:00-03:00'))).toBe('07:00');
  });
  it('formats 18:30 BRT correctly', () => {
    expect(formatSlotTime(new Date('2026-06-15T18:30:00-03:00'))).toBe('18:30');
  });
  it('formats 14:00 BRT correctly', () => {
    expect(formatSlotTime(new Date('2026-06-15T14:00:00-03:00'))).toBe('14:00');
  });
});

describe('SLOT_DURATION_OPTIONS', () => {
  it('contains 30, 45, 60', () => {
    expect(SLOT_DURATION_OPTIONS).toEqual([30, 45, 60]);
  });
});
