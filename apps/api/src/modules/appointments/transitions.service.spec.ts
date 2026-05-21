import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { TransitionsService } from './transitions.service';
import { PrismaService } from '../../prisma/prisma.service';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const baseAppt = {
  id: 'appt-1',
  userId: 'user-1',
  status: 'AGENDADO',
};

// ── Mock Prisma ───────────────────────────────────────────────────────────────

type MockPrisma = {
  appointment: { findFirst: jest.Mock; update: jest.Mock };
  appointmentEvent: { findMany: jest.Mock; create: jest.Mock };
  user: { findMany: jest.Mock };
  $transaction: jest.Mock;
};

const mockPrisma: MockPrisma = {
  appointment: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  appointmentEvent: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
  },
  $transaction: jest.fn((fn: (tx: MockPrisma) => Promise<unknown>) => fn(mockPrisma)),
};

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('TransitionsService', () => {
  let service: TransitionsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [TransitionsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<TransitionsService>(TransitionsService);
  });

  // ── transition ─────────────────────────────────────────────────────────────

  describe('transition', () => {
    it('throws NotFoundException when appointment does not exist', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue(null);
      await expect(service.transition('appt-99', 'CONFIRMADO', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws UnprocessableEntityException (INVALID_TRANSITION) for forbidden edge', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue({ ...baseAppt, status: 'AGENDADO' });
      const err = await service
        .transition('appt-1', 'REALIZADO', 'user-1')
        .catch((e: unknown) => e);
      expect(err).toBeInstanceOf(UnprocessableEntityException);
      expect((err as UnprocessableEntityException).getResponse()).toMatchObject({
        code: 'INVALID_TRANSITION',
      });
    });

    it('returns { status: CONFIRMADO } on AGENDADO → CONFIRMADO', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue({ ...baseAppt, status: 'AGENDADO' });
      mockPrisma.appointment.update.mockResolvedValue({});
      mockPrisma.appointmentEvent.create.mockResolvedValue({});
      const result = await service.transition('appt-1', 'CONFIRMADO', 'user-1');
      expect(result).toEqual({ status: 'CONFIRMADO' });
    });

    it('sets cancelledAt when transitioning to CANCELADO', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue({ ...baseAppt, status: 'AGENDADO' });
      mockPrisma.appointment.update.mockResolvedValue({});
      mockPrisma.appointmentEvent.create.mockResolvedValue({});
      await service.transition('appt-1', 'CANCELADO', 'user-1', 'Paciente cancelou');
      expect(mockPrisma.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ cancelledAt: expect.any(Date) }),
        }),
      );
    });

    it('records AppointmentEvent with action TRANSITIONED', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue({ ...baseAppt, status: 'AGENDADO' });
      mockPrisma.appointment.update.mockResolvedValue({});
      mockPrisma.appointmentEvent.create.mockResolvedValue({});
      await service.transition('appt-1', 'CONFIRMADO', 'user-1');
      expect(mockPrisma.appointmentEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'TRANSITIONED',
            fromStatus: 'AGENDADO',
            toStatus: 'CONFIRMADO',
          }),
        }),
      );
    });

    it('rejects EM_ATENDIMENTO → CANCELADO (invalid per FSM)', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue({
        ...baseAppt,
        status: 'EM_ATENDIMENTO',
      });
      await expect(service.transition('appt-1', 'CANCELADO', 'user-1')).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'INVALID_TRANSITION' }),
      });
    });

    it('throws CANCEL_REASON_REQUIRED when cancelling without a reason', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue({ ...baseAppt, status: 'AGENDADO' });
      const err = await service.transition('appt-1', 'CANCELADO', 'user-1').catch((e) => e);
      expect(err).toBeInstanceOf(UnprocessableEntityException);
      expect((err as UnprocessableEntityException).getResponse()).toMatchObject({
        code: 'CANCEL_REASON_REQUIRED',
      });
    });

    it('throws CANCEL_REASON_REQUIRED when reason is blank', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue({ ...baseAppt, status: 'AGENDADO' });
      const err = await service.transition('appt-1', 'CANCELADO', 'user-1', '   ').catch((e) => e);
      expect(err).toBeInstanceOf(UnprocessableEntityException);
      expect((err as UnprocessableEntityException).getResponse()).toMatchObject({
        code: 'CANCEL_REASON_REQUIRED',
      });
    });
  });

  // ── advance ────────────────────────────────────────────────────────────────

  describe('advance', () => {
    it('throws NotFoundException when appointment does not exist', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue(null);
      await expect(service.advance('appt-99', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('throws UnprocessableEntityException (TERMINAL_STATUS) for REALIZADO', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue({ ...baseAppt, status: 'REALIZADO' });
      const err = await service.advance('appt-1', 'user-1').catch((e: unknown) => e);
      expect(err).toBeInstanceOf(UnprocessableEntityException);
      expect((err as UnprocessableEntityException).getResponse()).toMatchObject({
        code: 'TERMINAL_STATUS',
      });
    });

    it('throws UnprocessableEntityException (TERMINAL_STATUS) for CANCELADO', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue({ ...baseAppt, status: 'CANCELADO' });
      const err = await service.advance('appt-1', 'user-1').catch((e: unknown) => e);
      expect(err).toBeInstanceOf(UnprocessableEntityException);
      expect((err as UnprocessableEntityException).getResponse()).toMatchObject({
        code: 'TERMINAL_STATUS',
      });
    });

    it('advances AGENDADO → CONFIRMADO', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue({ ...baseAppt, status: 'AGENDADO' });
      mockPrisma.appointment.update.mockResolvedValue({});
      mockPrisma.appointmentEvent.create.mockResolvedValue({});
      const result = await service.advance('appt-1', 'user-1');
      expect(result).toEqual({ status: 'CONFIRMADO' });
    });

    it('advances EM_ATENDIMENTO → REALIZADO', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue({
        ...baseAppt,
        status: 'EM_ATENDIMENTO',
      });
      mockPrisma.appointment.update.mockResolvedValue({});
      mockPrisma.appointmentEvent.create.mockResolvedValue({});
      const result = await service.advance('appt-1', 'user-1');
      expect(result).toEqual({ status: 'REALIZADO' });
    });
  });

  // ── listEvents ─────────────────────────────────────────────────────────────

  describe('listEvents', () => {
    it('throws NotFoundException when appointment does not exist', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue(null);
      await expect(service.listEvents('appt-99', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('returns events with resolved user names', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue({ id: 'appt-1' });
      mockPrisma.appointmentEvent.findMany.mockResolvedValue([
        {
          id: 'evt-1',
          appointmentId: 'appt-1',
          action: 'CREATED',
          fromStatus: null,
          toStatus: 'AGENDADO',
          byUserId: 'user-1',
          payload: null,
          createdAt: new Date('2026-01-01T10:00:00Z'),
        },
      ]);
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'user-1', name: 'Dr. Silva' }]);

      const result = await service.listEvents('appt-1', 'user-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'evt-1',
        action: 'CREATED',
        byUserName: 'Dr. Silva',
        createdAt: expect.any(String),
      });
    });

    it('returns events in chronological order (ascending)', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue({ id: 'appt-1' });
      mockPrisma.appointmentEvent.findMany.mockResolvedValue([
        {
          id: 'evt-1',
          appointmentId: 'appt-1',
          action: 'CREATED',
          fromStatus: null,
          toStatus: 'AGENDADO',
          byUserId: 'user-1',
          payload: null,
          createdAt: new Date('2026-01-01T10:00:00Z'),
        },
        {
          id: 'evt-2',
          appointmentId: 'appt-1',
          action: 'TRANSITIONED',
          fromStatus: 'AGENDADO',
          toStatus: 'CONFIRMADO',
          byUserId: 'user-1',
          payload: null,
          createdAt: new Date('2026-01-01T11:00:00Z'),
        },
      ]);
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'user-1', name: 'Dr. Silva' }]);

      const result = await service.listEvents('appt-1', 'user-1');

      expect(result[0]!.action).toBe('CREATED');
      expect(result[1]!.action).toBe('TRANSITIONED');
    });
  });
});
