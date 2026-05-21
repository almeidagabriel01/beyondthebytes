import type { AppointmentStatus } from '../schemas/appointment';

export const APPOINTMENT_STATUSES: readonly AppointmentStatus[] = [
  'AGENDADO',
  'CONFIRMADO',
  'AGUARDANDO',
  'EM_ATENDIMENTO',
  'REALIZADO',
  'CANCELADO',
];

const TRANSITIONS: Record<AppointmentStatus, ReadonlySet<AppointmentStatus>> = {
  AGENDADO: new Set(['CONFIRMADO', 'CANCELADO']),
  CONFIRMADO: new Set(['AGUARDANDO', 'CANCELADO']),
  AGUARDANDO: new Set(['EM_ATENDIMENTO']),
  EM_ATENDIMENTO: new Set(['REALIZADO']),
  REALIZADO: new Set(),
  CANCELADO: new Set(),
};

const ADVANCE_MAP: Record<AppointmentStatus, AppointmentStatus | null> = {
  AGENDADO: 'CONFIRMADO',
  CONFIRMADO: 'AGUARDANDO',
  AGUARDANDO: 'EM_ATENDIMENTO',
  EM_ATENDIMENTO: 'REALIZADO',
  REALIZADO: null,
  CANCELADO: null,
};

export function canTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return TRANSITIONS[from].has(to);
}

export function nextStatusOnAdvance(from: AppointmentStatus): AppointmentStatus | null {
  return ADVANCE_MAP[from];
}

export function isTerminal(status: AppointmentStatus): boolean {
  return TRANSITIONS[status].size === 0;
}
