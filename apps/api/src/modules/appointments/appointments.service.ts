import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, AppointmentType, AppointmentStatus } from '@prisma/client';
import { addMinutes } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { isValidSlot, isFutureSlot, isTerminal } from '@medschedule/shared';
import type {
  CreateAppointment,
  UpdateAppointment,
  CancelAppointment,
  ListAppointmentsQuery,
  AppointmentResponse,
  MonthSummaryItem,
  AppointmentStatus as SharedAppointmentStatus,
} from '@medschedule/shared';

type AppointmentWithPatient = {
  id: string;
  patientId: string;
  userId: string;
  startsAt: Date;
  endsAt: Date;
  durationMinutes: number;
  type: string;
  insurance: string;
  value: Prisma.Decimal | null;
  observations: string | null;
  status: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  cancelledAt: Date | null;
  cancelReason: string | null;
  patient: {
    id: string;
    fullName: string;
    cpf: string;
    phone: string;
  };
};

interface MonthSummaryRow {
  date: string;
  status: string;
  count: bigint;
}

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMonthSummary(from: string, to: string, userId: string): Promise<MonthSummaryItem[]> {
    const fromDate = new Date(from + 'T00:00:00-03:00');
    const toDate = new Date(to + 'T23:59:59-03:00');

    const rows = await this.prisma.$queryRaw<MonthSummaryRow[]>(
      Prisma.sql`
        SELECT
          TO_CHAR("startsAt" AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') AS date,
          status,
          COUNT(*) AS count
        FROM "Appointment"
        WHERE "userId" = ${userId} AND "startsAt" >= ${fromDate} AND "startsAt" <= ${toDate}
        GROUP BY 1, 2
        ORDER BY 1
      `,
    );

    // Aggregate rows into { date, counts: Record<status, number> }
    const map = new Map<string, Record<string, number>>();
    for (const row of rows) {
      if (!map.has(row.date)) {
        map.set(row.date, {});
      }
      map.get(row.date)![row.status] = Number(row.count);
    }

    return Array.from(map.entries()).map(([date, counts]) => ({ date, counts }));
  }

  async list(query: ListAppointmentsQuery, userId: string): Promise<AppointmentResponse[]> {
    const { date, from, to, status } = query;

    let dateFilter: Prisma.AppointmentWhereInput = {};

    if (date) {
      const dayStart = new Date(date + 'T00:00:00-03:00');
      const dayEnd = new Date(date + 'T23:59:59-03:00');
      dateFilter = { startsAt: { gte: dayStart, lte: dayEnd } };
    } else if (from || to) {
      dateFilter = {
        startsAt: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to) } : {}),
        },
      };
    }

    const appointments = await this.prisma.appointment.findMany({
      where: {
        userId,
        ...dateFilter,
        ...(status ? { status: status as AppointmentStatus } : {}),
      },
      include: {
        patient: { select: { id: true, fullName: true, cpf: true, phone: true } },
      },
      orderBy: { startsAt: 'asc' },
    });

    return appointments.map((a) => this._toResponse(a));
  }

  async findOne(id: string, userId: string): Promise<AppointmentResponse> {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, userId },
      include: {
        patient: { select: { id: true, fullName: true, cpf: true, phone: true } },
      },
    });
    if (!appointment) throw new NotFoundException('Consulta não encontrada');
    return this._toResponse(appointment);
  }

  async create(dto: CreateAppointment, userId: string): Promise<AppointmentResponse> {
    const startsAt = new Date(dto.startsAt);
    const endsAt = addMinutes(startsAt, dto.durationMinutes ?? 30);

    if (!isValidSlot(startsAt)) {
      throw new UnprocessableEntityException({
        code: 'INVALID_SLOT',
        message: 'Horário inválido: fora do expediente ou não alinhado em 30 minutos',
      });
    }
    if (!isFutureSlot(startsAt)) {
      throw new UnprocessableEntityException({
        code: 'PAST_SLOT',
        message: 'Não é possível agendar em horário passado',
      });
    }

    // Verify patient exists
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, deletedAt: null },
    });
    if (!patient) throw new NotFoundException('Paciente não encontrado');

    try {
      const appointment = await this.prisma.$transaction(async (tx) => {
        const created = await tx.appointment.create({
          data: {
            patientId: dto.patientId,
            userId,
            startsAt,
            endsAt,
            durationMinutes: dto.durationMinutes ?? 30,
            type: dto.type as AppointmentType,
            insurance: dto.insurance,
            value: dto.value !== undefined ? dto.value : null,
            observations: dto.observations ?? null,
            createdById: userId,
          },
          include: {
            patient: { select: { id: true, fullName: true, cpf: true, phone: true } },
          },
        });
        await tx.appointmentEvent.create({
          data: {
            appointmentId: created.id,
            action: 'CREATED',
            toStatus: 'AGENDADO',
            byUserId: userId,
            payload: {
              type: dto.type,
              insurance: dto.insurance,
              patientId: dto.patientId,
            } as Prisma.InputJsonValue,
          },
        });
        return created;
      });
      return this._toResponse(appointment);
    } catch (e) {
      this._handleConstraintError(e);
      throw e;
    }
  }

  async update(id: string, dto: UpdateAppointment, userId: string): Promise<AppointmentResponse> {
    const existing = await this.prisma.appointment.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('Consulta não encontrada');

    if (isTerminal(existing.status as SharedAppointmentStatus)) {
      throw new UnprocessableEntityException({
        code: 'TERMINAL_STATUS',
        message: 'Não é possível editar uma consulta cancelada ou realizada',
      });
    }

    let startsAt: Date | undefined;
    let endsAt: Date | undefined;

    if (dto.startsAt !== undefined) {
      startsAt = new Date(dto.startsAt);
      if (!isValidSlot(startsAt)) {
        throw new UnprocessableEntityException({
          code: 'INVALID_SLOT',
          message: 'Horário inválido: fora do expediente ou não alinhado em 30 minutos',
        });
      }
      if (!isFutureSlot(startsAt)) {
        throw new UnprocessableEntityException({
          code: 'PAST_SLOT',
          message: 'Não é possível agendar em horário passado',
        });
      }
      const duration = dto.durationMinutes ?? existing.durationMinutes;
      endsAt = addMinutes(startsAt, duration);
    } else if (dto.durationMinutes !== undefined) {
      // Duration changed but startsAt didn't — recompute endsAt
      endsAt = addMinutes(existing.startsAt, dto.durationMinutes);
    }

    try {
      const appointment = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.appointment.update({
          where: { id, userId },
          data: {
            ...(startsAt !== undefined ? { startsAt } : {}),
            ...(endsAt !== undefined ? { endsAt } : {}),
            ...(dto.durationMinutes !== undefined ? { durationMinutes: dto.durationMinutes } : {}),
            ...(dto.type !== undefined ? { type: dto.type as AppointmentType } : {}),
            ...(dto.insurance !== undefined ? { insurance: dto.insurance } : {}),
            ...(dto.value !== undefined ? { value: dto.value } : {}),
            ...(dto.observations !== undefined ? { observations: dto.observations ?? null } : {}),
          },
          include: {
            patient: { select: { id: true, fullName: true, cpf: true, phone: true } },
          },
        });
        await tx.appointmentEvent.create({
          data: {
            appointmentId: id,
            action: 'UPDATED',
            fromStatus: existing.status,
            toStatus: existing.status,
            byUserId: userId,
            payload: {
              type: dto.type,
              insurance: dto.insurance,
            } as Prisma.InputJsonValue,
          },
        });
        return updated;
      });
      return this._toResponse(appointment);
    } catch (e) {
      this._handleConstraintError(e);
      throw e;
    }
  }

  async cancel(id: string, dto: CancelAppointment, userId: string): Promise<AppointmentResponse> {
    const existing = await this.prisma.appointment.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('Consulta não encontrada');

    if (isTerminal(existing.status as SharedAppointmentStatus)) {
      throw new UnprocessableEntityException({
        code: 'TERMINAL_STATUS',
        message: 'Não é possível editar uma consulta cancelada ou realizada',
      });
    }

    const appointment = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.appointment
        .update({
          where: { id, userId, status: existing.status },
          data: {
            status: AppointmentStatus.CANCELADO,
            cancelledAt: new Date(),
            cancelReason: dto.reason,
          },
          include: {
            patient: { select: { id: true, fullName: true, cpf: true, phone: true } },
          },
        })
        .catch((e: unknown) => {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
            throw new ConflictException({
              code: 'STATUS_CONFLICT',
              message: 'O status da consulta foi alterado por outra requisição.',
            });
          }
          throw e;
        });
      await tx.appointmentEvent.create({
        data: {
          appointmentId: id,
          action: 'CANCELLED',
          fromStatus: existing.status,
          toStatus: 'CANCELADO',
          byUserId: userId,
          payload: { reason: dto.reason },
        },
      });
      return updated;
    });

    return this._toResponse(appointment);
  }

  private _toResponse(appt: AppointmentWithPatient): AppointmentResponse {
    return {
      id: appt.id,
      patientId: appt.patientId,
      patient: appt.patient,
      userId: appt.userId,
      startsAt: appt.startsAt.toISOString(),
      endsAt: appt.endsAt.toISOString(),
      durationMinutes: appt.durationMinutes,
      type: appt.type as AppointmentResponse['type'],
      insurance: appt.insurance,
      value: appt.value == null ? null : Number(appt.value),
      observations: appt.observations,
      status: appt.status as AppointmentResponse['status'],
      createdById: appt.createdById,
      createdAt: appt.createdAt.toISOString(),
      updatedAt: appt.updatedAt.toISOString(),
      cancelledAt: appt.cancelledAt ? appt.cancelledAt.toISOString() : null,
      cancelReason: appt.cancelReason,
    };
  }

  private _handleConstraintError(e: unknown): void {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2002' || e.code === 'P2010' || e.code === 'P2034') {
        const meta = e.meta as Record<string, unknown> | undefined;
        const message = String(meta?.message ?? meta?.details ?? '');
        const target = Array.isArray(meta?.target)
          ? (meta.target as string[]).join(',')
          : String(meta?.target ?? '');
        if (message.includes('no_overlap') || target.includes('no_overlap')) {
          throw new ConflictException({
            code: 'SLOT_CONFLICT',
            message: 'Horário já ocupado para este profissional',
          });
        }
      }
    }
  }
}
