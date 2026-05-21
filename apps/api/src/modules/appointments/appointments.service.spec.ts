import { Test, type TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppointmentsService } from './appointments.service';
import { PrismaService } from '../../prisma/prisma.service';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const FUTURE_VALID_SLOT = '2099-06-15T09:00:00-03:00'; // 09:00 BRT, minute=0 ✓
const INVALID_SLOT = '2099-06-15T09:15:00-03:00'; // minute=15, fails isValidSlot
const PAST_VALID_SLOT = '2020-06-15T09:00:00-03:00'; // valid alignment, past date

const dbPatient = {
  id: 'pat-1',
  fullName: 'Maria Souza',
  cpf: '52998224725',
  phone: '(11) 91234-5678',
};

const dbAppointment = {
  id: 'appt-1',
  patientId: 'pat-1',
  userId: 'user-1',
  startsAt: new Date(FUTURE_VALID_SLOT),
  endsAt: new Date('2099-06-15T09:30:00-03:00'),
  durationMinutes: 30,
  type: 'CONSULTA',
  insurance: 'PARTICULAR',
  value: null,
  observations: null,
  status: 'AGENDADO',
  createdById: 'user-1',
  createdAt: new Date('2026-01-01T10:00:00Z'),
  updatedAt: new Date('2026-01-01T10:00:00Z'),
  cancelledAt: null,
  cancelReason: null,
  patient: dbPatient,
};

// ── Mock Prisma ───────────────────────────────────────────────────────────────

const mockPrisma = {
  appointment: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  patient: {
    findFirst: jest.fn(),
  },
  appointmentEvent: {
    create: jest.fn(),
  },
  $queryRaw: jest.fn(),
  $transaction: jest.fn((arg: unknown): Promise<unknown> => {
    if (typeof arg === 'function') {
      // Interactive transaction: call the function with mock as tx
      return (arg as (tx: unknown) => Promise<unknown>)(mockPrisma);
    }
    // Array-style transaction
    return Promise.all(arg as Promise<unknown>[]);
  }),
};

// ── Test Suite ────────────────────────────────────────────────────────────────

describe('AppointmentsService', () => {
  let service: AppointmentsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [AppointmentsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    const baseDto = {
      patientId: 'pat-1',
      startsAt: FUTURE_VALID_SLOT,
      durationMinutes: 30 as const,
      type: 'CONSULTA' as const,
      insurance: 'PARTICULAR',
    };

    it('throws UnprocessableEntityException for an invalid slot (09:15)', async () => {
      await expect(
        service.create({ ...baseDto, startsAt: INVALID_SLOT }, 'user-1'),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws UnprocessableEntityException for a past slot (2020)', async () => {
      await expect(
        service.create({ ...baseDto, startsAt: PAST_VALID_SLOT }, 'user-1'),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws NotFoundException when patient does not exist', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(null);

      await expect(service.create(baseDto, 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException on exclusion constraint violation (P2010 + no_overlap)', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(dbPatient);
      mockPrisma.appointment.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Exclusion constraint violated', {
          code: 'P2010',
          clientVersion: '6.0.0',
          meta: {
            message: 'conflicting key value violates exclusion constraint "no_overlap_per_user"',
          },
        }),
      );
      mockPrisma.appointmentEvent.create.mockResolvedValue({});

      await expect(service.create(baseDto, 'user-1')).rejects.toThrow(ConflictException);
    });

    it('returns AppointmentResponse with status AGENDADO on happy path', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(dbPatient);
      mockPrisma.appointment.create.mockResolvedValue(dbAppointment);
      mockPrisma.appointmentEvent.create.mockResolvedValue({});

      const result = await service.create(baseDto, 'user-1');

      expect(result).toMatchObject({
        id: 'appt-1',
        status: 'AGENDADO',
        patientId: 'pat-1',
        patient: expect.objectContaining({ fullName: 'Maria Souza' }),
      });
      expect(typeof result.startsAt).toBe('string');
    });
  });

  // ── cancel ─────────────────────────────────────────────────────────────────

  describe('cancel', () => {
    const cancelDto = { reason: 'Paciente solicitou cancelamento' };

    it('throws NotFoundException when appointment does not exist', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue(null);

      await expect(service.cancel('appt-99', cancelDto, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws UnprocessableEntityException (TERMINAL_STATUS) when already CANCELADO', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue({
        ...dbAppointment,
        status: 'CANCELADO',
      });

      const err = await service.cancel('appt-1', cancelDto, 'user-1').catch((e: unknown) => e);
      expect(err).toBeInstanceOf(UnprocessableEntityException);
      expect((err as UnprocessableEntityException).getResponse()).toMatchObject({
        code: 'TERMINAL_STATUS',
      });
    });

    it('throws UnprocessableEntityException (TERMINAL_STATUS) when already REALIZADO', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue({
        ...dbAppointment,
        status: 'REALIZADO',
      });

      const err = await service.cancel('appt-1', cancelDto, 'user-1').catch((e: unknown) => e);
      expect(err).toBeInstanceOf(UnprocessableEntityException);
      expect((err as UnprocessableEntityException).getResponse()).toMatchObject({
        code: 'TERMINAL_STATUS',
      });
    });

    it('returns AppointmentResponse with status CANCELADO and cancelReason on happy path', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue(dbAppointment);
      const cancelledAppt = {
        ...dbAppointment,
        status: 'CANCELADO',
        cancelledAt: new Date(),
        cancelReason: cancelDto.reason,
      };
      mockPrisma.appointment.update.mockResolvedValue(cancelledAppt);
      mockPrisma.appointmentEvent.create.mockResolvedValue({});

      const result = await service.cancel('appt-1', cancelDto, 'user-1');

      expect(result.status).toBe('CANCELADO');
      expect(result.cancelReason).toBe(cancelDto.reason);
    });
  });

  // ── list ───────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns empty array when no appointments', async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([]);
      const result = await service.list({}, 'user-1');
      expect(result).toEqual([]);
    });

    it('queries with date filter', async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([dbAppointment]);
      const result = await service.list({ date: '2099-06-15' }, 'user-1');
      expect(result).toHaveLength(1);
      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-1' }),
        }),
      );
    });

    it('queries with single-element status filter', async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([dbAppointment]);
      await service.list({ status: ['AGENDADO'] }, 'user-1');
      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: { in: ['AGENDADO'] } }),
        }),
      );
    });

    it('queries with multi-status filter (REALIZADO + CANCELADO for /historico)', async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([]);
      await service.list({ status: ['REALIZADO', 'CANCELADO'] }, 'user-1');
      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: { in: ['REALIZADO', 'CANCELADO'] } }),
        }),
      );
    });

    it('queries with from/to range filter (ISO datetime)', async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([]);
      await service.list(
        { from: '2099-06-01T00:00:00-03:00', to: '2099-06-30T23:59:59-03:00' },
        'user-1',
      );
      expect(mockPrisma.appointment.findMany).toHaveBeenCalled();
    });

    it('expands YYYY-MM-DD from/to to BRT day boundaries', async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([]);
      await service.list({ from: '2099-06-01', to: '2099-06-30' }, 'user-1');
      const call = mockPrisma.appointment.findMany.mock.calls[0][0] as {
        where: { startsAt: { gte: Date; lte: Date } };
      };
      expect(call.where.startsAt.gte.toISOString()).toBe('2099-06-01T03:00:00.000Z');
      expect(call.where.startsAt.lte.toISOString()).toBe('2099-07-01T02:59:59.000Z');
    });

    it('applies desc order when requested', async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([]);
      await service.list({ order: 'desc' }, 'user-1');
      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { startsAt: 'desc' } }),
      );
    });

    it('uses default take=50 and skip=0 when not provided', async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([]);
      await service.list({}, 'user-1');
      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50, skip: 0 }),
      );
    });

    it('passes through valid take and skip', async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([]);
      await service.list({ take: 25, skip: 10 }, 'user-1');
      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 25, skip: 10 }),
      );
    });

    it('caps take at MAX_TAKE (100) even if Zod is bypassed', async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([]);
      // simulate a caller passing 999 directly (bypassing Zod schema)
      await service.list({ take: 999 } as unknown as Parameters<typeof service.list>[0], 'user-1');
      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });

    it('throws RANGE_TOO_WIDE when from/to span exceeds 365 days', async () => {
      const err = await service
        .list({ from: '2099-01-01', to: '2100-06-01' }, 'user-1')
        .catch((e: unknown) => e);
      expect(err).toBeInstanceOf(BadRequestException);
      expect((err as BadRequestException).getResponse()).toMatchObject({
        code: 'RANGE_TOO_WIDE',
      });
      expect(mockPrisma.appointment.findMany).not.toHaveBeenCalled();
    });

    it('allows ranges up to 365 days', async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([]);
      await service.list({ from: '2099-01-01', to: '2099-12-15' }, 'user-1');
      expect(mockPrisma.appointment.findMany).toHaveBeenCalled();
    });
  });

  // ── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('throws UnprocessableEntityException (TERMINAL_STATUS) when appointment is CANCELADO', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue({
        ...dbAppointment,
        status: 'CANCELADO',
      });

      const err = await service
        .update('appt-1', { insurance: 'UNIMED' }, 'user-1')
        .catch((e: unknown) => e);
      expect(err).toBeInstanceOf(UnprocessableEntityException);
      expect((err as UnprocessableEntityException).getResponse()).toMatchObject({
        code: 'TERMINAL_STATUS',
      });
    });

    it('returns updated AppointmentResponse on happy path (no startsAt change)', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue(dbAppointment);
      const updatedAppt = { ...dbAppointment, insurance: 'UNIMED' };
      mockPrisma.appointment.update.mockResolvedValue(updatedAppt);
      mockPrisma.appointmentEvent.create.mockResolvedValue({});

      const result = await service.update('appt-1', { insurance: 'UNIMED' }, 'user-1');

      expect(result.insurance).toBe('UNIMED');
      expect(result.id).toBe('appt-1');
    });

    it('throws INVALID_SLOT when new startsAt has invalid minutes (09:15)', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue(dbAppointment);

      await expect(service.update('appt-1', { startsAt: INVALID_SLOT }, 'user-1')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('throws PAST_SLOT when new startsAt is in the past', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue(dbAppointment);

      await expect(
        service.update('appt-1', { startsAt: PAST_VALID_SLOT }, 'user-1'),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('recomputes endsAt when only durationMinutes changes', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue(dbAppointment);
      const updatedAppt = { ...dbAppointment, durationMinutes: 60 };
      mockPrisma.appointment.update.mockResolvedValue(updatedAppt);
      mockPrisma.appointmentEvent.create.mockResolvedValue({});

      const result = await service.update('appt-1', { durationMinutes: 60 }, 'user-1');

      expect(result.durationMinutes).toBe(60);
    });

    it('throws ConflictException on exclusion constraint violation in update (P2010)', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue(dbAppointment);
      mockPrisma.appointment.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Exclusion constraint violated', {
          code: 'P2010',
          clientVersion: '6.0.0',
          meta: {
            message: 'conflicting key value violates exclusion constraint "no_overlap_per_user"',
          },
        }),
      );
      mockPrisma.appointmentEvent.create.mockResolvedValue({});

      await expect(
        service.update('appt-1', { startsAt: FUTURE_VALID_SLOT }, 'user-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException when appointment does not exist', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue(null);

      await expect(service.update('appt-99', { insurance: 'UNIMED' }, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── findOne ────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('throws NotFoundException when appointment does not exist', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue(null);

      await expect(service.findOne('appt-99', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('returns AppointmentResponse on happy path', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue(dbAppointment);

      const result = await service.findOne('appt-1', 'user-1');

      expect(result).toMatchObject({
        id: 'appt-1',
        status: 'AGENDADO',
        patient: expect.objectContaining({ id: 'pat-1' }),
      });
    });
  });

  // ── getMonthSummary ────────────────────────────────────────────────────────

  describe('getMonthSummary', () => {
    it('groups rows by date and converts BigInt count to Number', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        { date: '2026-05-20', status: 'AGENDADO', count: BigInt(3) },
        { date: '2026-05-20', status: 'CANCELADO', count: BigInt(1) },
        { date: '2026-05-21', status: 'AGENDADO', count: BigInt(2) },
      ]);

      const result = await service.getMonthSummary('2026-05-01', '2026-05-31', 'user-1');

      expect(result).toEqual([
        { date: '2026-05-20', counts: { AGENDADO: 3, CANCELADO: 1 } },
        { date: '2026-05-21', counts: { AGENDADO: 2 } },
      ]);
      // Ensure counts are plain numbers, not BigInt
      expect(typeof result[0]!.counts['AGENDADO']).toBe('number');
    });
  });
});
