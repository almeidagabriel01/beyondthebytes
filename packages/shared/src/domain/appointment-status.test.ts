import {
  canTransition,
  nextStatusOnAdvance,
  isTerminal,
  APPOINTMENT_STATUSES,
} from './appointment-status';
import type { AppointmentStatus } from '../schemas/appointment';

const ALL = APPOINTMENT_STATUSES;

// ── Tabela-verdade completa 6×6 ───────────────────────────────────────────────

describe('canTransition — tabela-verdade completa', () => {
  const ALLOWED: [AppointmentStatus, AppointmentStatus][] = [
    ['AGENDADO', 'CONFIRMADO'],
    ['AGENDADO', 'CANCELADO'],
    ['CONFIRMADO', 'AGUARDANDO'],
    ['CONFIRMADO', 'CANCELADO'],
    ['AGUARDANDO', 'EM_ATENDIMENTO'],
    ['EM_ATENDIMENTO', 'REALIZADO'],
  ];

  const allowedSet = new Set(ALLOWED.map(([f, t]) => `${f}->${t}`));

  for (const from of ALL) {
    for (const to of ALL) {
      const key = `${from}->${to}`;
      const expected = allowedSet.has(key);
      it(`${from} → ${to}: ${expected}`, () => {
        expect(canTransition(from, to)).toBe(expected);
      });
    }
  }
});

// ── nextStatusOnAdvance (caminho feliz) ────────────────────────────────────────

describe('nextStatusOnAdvance', () => {
  it('AGENDADO avança para CONFIRMADO', () => {
    expect(nextStatusOnAdvance('AGENDADO')).toBe('CONFIRMADO');
  });

  it('CONFIRMADO avança para AGUARDANDO', () => {
    expect(nextStatusOnAdvance('CONFIRMADO')).toBe('AGUARDANDO');
  });

  it('AGUARDANDO avança para EM_ATENDIMENTO', () => {
    expect(nextStatusOnAdvance('AGUARDANDO')).toBe('EM_ATENDIMENTO');
  });

  it('EM_ATENDIMENTO avança para REALIZADO', () => {
    expect(nextStatusOnAdvance('EM_ATENDIMENTO')).toBe('REALIZADO');
  });

  it('REALIZADO retorna null (terminal)', () => {
    expect(nextStatusOnAdvance('REALIZADO')).toBeNull();
  });

  it('CANCELADO retorna null (terminal)', () => {
    expect(nextStatusOnAdvance('CANCELADO')).toBeNull();
  });
});

// ── isTerminal ─────────────────────────────────────────────────────────────────

describe('isTerminal', () => {
  it('REALIZADO é terminal', () => expect(isTerminal('REALIZADO')).toBe(true));
  it('CANCELADO é terminal', () => expect(isTerminal('CANCELADO')).toBe(true));
  it('AGENDADO não é terminal', () => expect(isTerminal('AGENDADO')).toBe(false));
  it('CONFIRMADO não é terminal', () => expect(isTerminal('CONFIRMADO')).toBe(false));
  it('AGUARDANDO não é terminal', () => expect(isTerminal('AGUARDANDO')).toBe(false));
  it('EM_ATENDIMENTO não é terminal', () => expect(isTerminal('EM_ATENDIMENTO')).toBe(false));
});
