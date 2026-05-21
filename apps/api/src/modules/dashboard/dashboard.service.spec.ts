import { Test, type TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../../prisma/prisma.service';

const FIXED_NOW = new Date('2026-05-20T15:00:00-03:00');

const mockPrisma = {
  appointment: {
    findMany: jest.fn(),
    groupBy: jest.fn(),
    count: jest.fn(),
  },
};

function appt(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'a1',
    startsAt: new Date('2026-05-20T16:00:00-03:00'),
    endsAt: new Date('2026-05-20T16:30:00-03:00'),
    status: 'AGENDADO',
    type: 'CONSULTA',
    patient: { id: 'p1', fullName: 'Maria Souza' },
    ...over,
  };
}

describe('DashboardService', () => {
  let service: DashboardService;

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(FIXED_NOW);
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [DashboardService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(DashboardService);
  });

  describe('getToday', () => {
    it('returns zeros when no appointments today', async () => {
      mockPrisma.appointment.groupBy.mockResolvedValue([]);
      mockPrisma.appointment.findMany.mockResolvedValue([]);
      mockPrisma.appointment.count.mockResolvedValue(0);

      const result = await service.getToday('user-1');

      expect(result.totalToday).toBe(0);
      expect(result.cancelledToday).toBe(0);
      expect(result.completedToday).toBe(0);
      expect(result.nextAppointments).toEqual([]);
      expect(result.byStatus.AGENDADO).toBe(0);
      expect(result.byStatus.REALIZADO).toBe(0);
    });

    it('aggregates byStatus and counts cancelled/completed for today', async () => {
      mockPrisma.appointment.groupBy.mockResolvedValue([
        { status: 'AGENDADO', _count: { _all: 3 } },
        { status: 'REALIZADO', _count: { _all: 2 } },
        { status: 'CANCELADO', _count: { _all: 1 } },
      ]);
      mockPrisma.appointment.findMany.mockResolvedValue([
        appt({ id: 'a1', startsAt: new Date('2026-05-20T16:00:00-03:00') }),
      ]);
      mockPrisma.appointment.count.mockResolvedValue(6);

      const result = await service.getToday('user-1');

      expect(result.totalToday).toBe(6);
      expect(result.byStatus.AGENDADO).toBe(3);
      expect(result.byStatus.REALIZADO).toBe(2);
      expect(result.byStatus.CANCELADO).toBe(1);
      expect(result.byStatus.CONFIRMADO).toBe(0);
      expect(result.completedToday).toBe(2);
      expect(result.cancelledToday).toBe(1);
    });

    it('filters nextAppointments to upcoming non-terminal within today, limit 10', async () => {
      mockPrisma.appointment.groupBy.mockResolvedValue([]);
      mockPrisma.appointment.count.mockResolvedValue(0);
      mockPrisma.appointment.findMany.mockResolvedValue([appt({ id: 'a1' }), appt({ id: 'a2' })]);

      const result = await service.getToday('user-1');

      expect(result.nextAppointments).toHaveLength(2);
      const findCall = mockPrisma.appointment.findMany.mock.calls[0][0];
      expect(findCall.take).toBe(10);
      expect(findCall.where.status.notIn).toEqual(
        expect.arrayContaining(['CANCELADO', 'REALIZADO']),
      );
      expect(findCall.where.userId).toBe('user-1');
    });

    it('serializes Date fields to ISO strings in nextAppointments', async () => {
      mockPrisma.appointment.groupBy.mockResolvedValue([]);
      mockPrisma.appointment.count.mockResolvedValue(0);
      mockPrisma.appointment.findMany.mockResolvedValue([appt()]);

      const result = await service.getToday('user-1');

      const first = result.nextAppointments[0];
      expect(first).toBeDefined();
      expect(typeof first?.startsAt).toBe('string');
      expect(typeof first?.endsAt).toBe('string');
    });
  });

  describe('getKpis', () => {
    it('returns 0 attendanceRate when total is 0', async () => {
      mockPrisma.appointment.groupBy.mockResolvedValue([]);

      const result = await service.getKpis('user-1', 'week');

      expect(result.total).toBe(0);
      expect(result.completed).toBe(0);
      expect(result.cancelled).toBe(0);
      expect(result.attendanceRate).toBe(0);
      expect(result.period).toBe('week');
    });

    it('computes attendanceRate as completed/(realizadas + canceladas)', async () => {
      mockPrisma.appointment.groupBy.mockResolvedValue([
        { status: 'AGENDADO', _count: { _all: 2 } },
        { status: 'REALIZADO', _count: { _all: 6 } },
        { status: 'CANCELADO', _count: { _all: 2 } },
      ]);

      const result = await service.getKpis('user-1', 'week');

      expect(result.total).toBe(10);
      expect(result.completed).toBe(6);
      expect(result.cancelled).toBe(2);
      // 6 / (6 + 2) = 0.75
      expect(result.attendanceRate).toBeCloseTo(0.75, 4);
    });

    it('uses month range when period=month', async () => {
      mockPrisma.appointment.groupBy.mockResolvedValue([]);
      await service.getKpis('user-1', 'month');
      const args = mockPrisma.appointment.groupBy.mock.calls[0][0];
      const from: Date = args.where.startsAt.gte;
      const to: Date = args.where.startsAt.lt;
      const diffDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThanOrEqual(28);
      expect(diffDays).toBeLessThanOrEqual(31);
    });

    it('scopes queries by userId', async () => {
      mockPrisma.appointment.groupBy.mockResolvedValue([]);
      await service.getKpis('user-7', 'week');
      const args = mockPrisma.appointment.groupBy.mock.calls[0][0];
      expect(args.where.userId).toBe('user-7');
    });
  });
});
