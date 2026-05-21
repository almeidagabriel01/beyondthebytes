import type { AppointmentResponse } from '@medschedule/shared';

export function getBrtHour(d: Date): number {
  return parseInt(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      hour12: false,
    }).format(d),
    10,
  );
}

export function groupByPeriod(appointments: AppointmentResponse[]): {
  manha: AppointmentResponse[];
  tarde: AppointmentResponse[];
  noite: AppointmentResponse[];
} {
  const manha: AppointmentResponse[] = [];
  const tarde: AppointmentResponse[] = [];
  const noite: AppointmentResponse[] = [];

  for (const appt of appointments) {
    const hour = getBrtHour(new Date(appt.startsAt));
    if (hour >= 7 && hour <= 11) {
      manha.push(appt);
    } else if (hour >= 12 && hour <= 17) {
      tarde.push(appt);
    } else {
      noite.push(appt);
    }
  }

  return { manha, tarde, noite };
}
