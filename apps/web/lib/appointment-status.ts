import type { AppointmentResponse } from '@medschedule/shared';

/**
 * "Vencido" is a derived visual state (not a real status). It marks
 * appointments that are still in a non-terminal, non-active status whose
 * start time has already passed. EM_ATENDIMENTO is excluded because it's
 * actively in progress.
 */
export function isVencido(
  appt: Pick<AppointmentResponse, 'status' | 'startsAt'>,
  now: Date = new Date(),
): boolean {
  if (
    appt.status === 'CANCELADO' ||
    appt.status === 'REALIZADO' ||
    appt.status === 'EM_ATENDIMENTO'
  ) {
    return false;
  }
  return new Date(appt.startsAt) < now;
}
