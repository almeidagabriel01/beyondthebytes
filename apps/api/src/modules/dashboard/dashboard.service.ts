import { Injectable } from '@nestjs/common';
import { AppointmentStatus, type Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  DashboardTodayResponse,
  DashboardKpisResponse,
  KpisPeriod,
  NextAppointment,
} from '@medschedule/shared';

const ALL_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.AGENDADO,
  AppointmentStatus.CONFIRMADO,
  AppointmentStatus.AGUARDANDO,
  AppointmentStatus.EM_ATENDIMENTO,
  AppointmentStatus.REALIZADO,
  AppointmentStatus.CANCELADO,
];

const TERMINAL_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.CANCELADO,
  AppointmentStatus.REALIZADO,
];

// Brazil timezone offset (BRT, UTC-3, no DST since 2019).
const BRT_OFFSET_MS = -3 * 60 * 60 * 1000;

function startOfTodayBRT(now: Date): Date {
  const utcMs = now.getTime();
  const brtMs = utcMs + BRT_OFFSET_MS;
  const brtMidnight = Math.floor(brtMs / (24 * 60 * 60 * 1000)) * 24 * 60 * 60 * 1000;
  return new Date(brtMidnight - BRT_OFFSET_MS);
}

function endOfTodayBRT(now: Date): Date {
  return new Date(startOfTodayBRT(now).getTime() + 24 * 60 * 60 * 1000);
}

function rangeFor(now: Date, period: KpisPeriod): { from: Date; to: Date } {
  if (period === 'week') {
    const todayStart = startOfTodayBRT(now);
    const from = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);
    const to = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    return { from, to };
  }
  const brt = new Date(now.getTime() + BRT_OFFSET_MS);
  const fromBrt = Date.UTC(brt.getUTCFullYear(), brt.getUTCMonth(), 1);
  const toBrt = Date.UTC(brt.getUTCFullYear(), brt.getUTCMonth() + 1, 1);
  return {
    from: new Date(fromBrt - BRT_OFFSET_MS),
    to: new Date(toBrt - BRT_OFFSET_MS),
  };
}

function emptyByStatus(): Record<AppointmentStatus, number> {
  return ALL_STATUSES.reduce(
    (acc, s) => {
      acc[s] = 0;
      return acc;
    },
    {} as Record<AppointmentStatus, number>,
  );
}

type ApptForList = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  type: string;
  patient: { id: string; fullName: string };
};

function toNextAppt(a: ApptForList): NextAppointment {
  return {
    id: a.id,
    startsAt: a.startsAt.toISOString(),
    endsAt: a.endsAt.toISOString(),
    status: a.status as NextAppointment['status'],
    type: a.type,
    patient: a.patient,
  };
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getToday(userId: string): Promise<DashboardTodayResponse> {
    const now = new Date();
    const dayStart = startOfTodayBRT(now);
    const dayEnd = endOfTodayBRT(now);

    const todayWhere: Prisma.AppointmentWhereInput = {
      userId,
      startsAt: { gte: dayStart, lt: dayEnd },
    };

    const [grouped, total, upcoming] = await Promise.all([
      this.prisma.appointment.groupBy({
        by: ['status'],
        where: todayWhere,
        _count: { _all: true },
      }),
      this.prisma.appointment.count({ where: todayWhere }),
      this.prisma.appointment.findMany({
        where: {
          userId,
          startsAt: { gte: now, lt: dayEnd },
          status: { notIn: TERMINAL_STATUSES },
        },
        orderBy: { startsAt: 'asc' },
        take: 10,
        select: {
          id: true,
          startsAt: true,
          endsAt: true,
          status: true,
          type: true,
          patient: { select: { id: true, fullName: true } },
        },
      }),
    ]);

    const byStatus = emptyByStatus();
    for (const row of grouped) {
      byStatus[row.status as AppointmentStatus] = row._count._all;
    }

    return {
      totalToday: total,
      byStatus,
      nextAppointments: (upcoming as ApptForList[]).map(toNextAppt),
      cancelledToday: byStatus[AppointmentStatus.CANCELADO],
      completedToday: byStatus[AppointmentStatus.REALIZADO],
    };
  }

  async getKpis(userId: string, period: KpisPeriod): Promise<DashboardKpisResponse> {
    const now = new Date();
    const { from, to } = rangeFor(now, period);

    const grouped = await this.prisma.appointment.groupBy({
      by: ['status'],
      where: { userId, startsAt: { gte: from, lt: to } },
      _count: { _all: true },
    });

    let total = 0;
    let completed = 0;
    let cancelled = 0;
    for (const row of grouped) {
      total += row._count._all;
      if (row.status === AppointmentStatus.REALIZADO) completed += row._count._all;
      if (row.status === AppointmentStatus.CANCELADO) cancelled += row._count._all;
    }

    const terminalTotal = completed + cancelled;
    const attendanceRate = terminalTotal === 0 ? 0 : completed / terminalTotal;

    return { period, total, completed, cancelled, attendanceRate };
  }
}
