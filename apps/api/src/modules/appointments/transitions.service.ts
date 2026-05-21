import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { AppointmentStatus as PrismaStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  canTransition,
  nextStatusOnAdvance,
  isTerminal,
  type AppointmentStatus,
  type AppointmentEventResponse,
} from '@medschedule/shared';

@Injectable()
export class TransitionsService {
  constructor(private readonly prisma: PrismaService) {}

  async transition(
    id: string,
    to: AppointmentStatus,
    userId: string,
    reason?: string,
  ): Promise<{ status: AppointmentStatus }> {
    const appt = await this.prisma.appointment.findFirst({ where: { id, userId } });
    if (!appt) throw new NotFoundException('Consulta não encontrada');

    const from = appt.status as AppointmentStatus;

    if (!canTransition(from, to)) {
      throw new UnprocessableEntityException({
        code: 'INVALID_TRANSITION',
        message: `Transição inválida: ${from} → ${to}`,
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.appointment.update({
        where: { id },
        data: {
          status: to as PrismaStatus,
          ...(to === 'CANCELADO' ? { cancelledAt: new Date(), cancelReason: reason ?? null } : {}),
        },
      });
      await tx.appointmentEvent.create({
        data: {
          appointmentId: id,
          action: 'TRANSITIONED',
          fromStatus: from,
          toStatus: to,
          byUserId: userId,
          payload: reason ? ({ reason } as Prisma.InputJsonValue) : Prisma.DbNull,
        },
      });
    });

    return { status: to };
  }

  async advance(id: string, userId: string): Promise<{ status: AppointmentStatus }> {
    const appt = await this.prisma.appointment.findFirst({ where: { id, userId } });
    if (!appt) throw new NotFoundException('Consulta não encontrada');

    const from = appt.status as AppointmentStatus;

    if (isTerminal(from)) {
      throw new UnprocessableEntityException({
        code: 'TERMINAL_STATUS',
        message: `Consulta está em estado terminal: ${from}`,
      });
    }

    const next = nextStatusOnAdvance(from);
    if (!next) {
      throw new UnprocessableEntityException({
        code: 'NO_ADVANCE',
        message: `Não há próximo estado para: ${from}`,
      });
    }

    return this.transition(id, next, userId);
  }

  async listEvents(id: string, userId: string): Promise<AppointmentEventResponse[]> {
    const appt = await this.prisma.appointment.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!appt) throw new NotFoundException('Consulta não encontrada');

    const events = await this.prisma.appointmentEvent.findMany({
      where: { appointmentId: id },
      orderBy: { createdAt: 'asc' },
    });

    const userIds = [...new Set(events.map((e) => e.byUserId))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u.name]));

    return events.map((e) => ({
      id: e.id,
      appointmentId: e.appointmentId,
      action: e.action,
      fromStatus: e.fromStatus,
      toStatus: e.toStatus,
      byUserId: e.byUserId,
      byUserName: userMap.get(e.byUserId) ?? '',
      payload: e.payload,
      createdAt: e.createdAt.toISOString(),
    }));
  }
}
