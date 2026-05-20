import { Test, type TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

const createdByUser = { id: 'user-1', name: 'Administrador', email: 'admin@medschedule.local' };

const dbPatient = {
  id: 'pat-1',
  fullName: 'João da Silva',
  cpf: '52998224725',
  phone: '(11) 91234-5678',
  birthDate: new Date('1990-06-15'),
  email: 'joao@email.com',
  observations: null,
  createdById: 'user-1',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  deletedAt: null,
  createdBy: createdByUser,
};

const mockPrisma = {
  patient: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  $queryRaw: jest.fn(),
};

describe('PatientsService', () => {
  let service: PatientsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [PatientsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<PatientsService>(PatientsService);
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto = {
      fullName: 'João da Silva',
      cpf: '52998224725',
      phone: '(11) 91234-5678',
      birthDate: '1990-06-15',
      email: 'joao@email.com',
    };

    it('creates and returns patient response', async () => {
      mockPrisma.patient.create.mockResolvedValue(dbPatient);

      const result = await service.create(dto, 'user-1');

      expect(mockPrisma.patient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ cpf: '52998224725', createdById: 'user-1' }),
        }),
      );
      expect(result).toMatchObject({ id: 'pat-1', fullName: 'João da Silva', cpf: '52998224725' });
      expect(result.createdBy).toMatchObject({ name: 'Administrador' });
    });

    it('throws ConflictException on duplicate CPF (P2002)', async () => {
      const p2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '6.0.0',
      });
      mockPrisma.patient.create.mockRejectedValue(p2002);

      await expect(service.create(dto, 'user-1')).rejects.toThrow(ConflictException);
    });

    it('re-throws unknown errors', async () => {
      mockPrisma.patient.create.mockRejectedValue(new Error('DB down'));

      await expect(service.create(dto, 'user-1')).rejects.toThrow('DB down');
    });
  });

  // ── findAll (no search) ───────────────────────────────────────────────────

  describe('findAll without search', () => {
    it('returns paginated list with nextCursor when there are more results', async () => {
      const patients = Array.from({ length: 21 }, (_, i) => ({
        ...dbPatient,
        id: `pat-${i}`,
      }));
      mockPrisma.patient.findMany.mockResolvedValue(patients);

      const result = await service.findAll({ limit: 20 });

      expect(result.items).toHaveLength(20);
      expect(result.nextCursor).toBe('pat-19');
    });

    it('returns null nextCursor when no more results', async () => {
      mockPrisma.patient.findMany.mockResolvedValue([dbPatient]);

      const result = await service.findAll({ limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).toBeNull();
    });

    it('passes cursor to findMany query', async () => {
      mockPrisma.patient.findMany.mockResolvedValue([]);

      await service.findAll({ cursor: 'some-id', limit: 20 });

      expect(mockPrisma.patient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: { gt: 'some-id' } }),
        }),
      );
    });
  });

  // ── findAll (with search) ─────────────────────────────────────────────────

  describe('findAll with search', () => {
    it('uses $queryRaw for trigram search', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([dbPatient]);

      const result = await service.findAll({ search: 'João', limit: 20 });

      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
      expect(mockPrisma.patient.findMany).not.toHaveBeenCalled();
      expect(result.items).toHaveLength(1);
    });
  });

  // ── findOne ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns patient when found and not deleted', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(dbPatient);

      const result = await service.findOne('pat-1');

      expect(result.id).toBe('pat-1');
    });

    it('throws NotFoundException when not found', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(null);

      await expect(service.findOne('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates and returns patient', async () => {
      const updated = { ...dbPatient, fullName: 'João Atualizado' };
      mockPrisma.patient.findFirst.mockResolvedValue(dbPatient);
      mockPrisma.patient.update.mockResolvedValue(updated);

      const result = await service.update('pat-1', { fullName: 'João Atualizado' });

      expect(result.fullName).toBe('João Atualizado');
    });

    it('throws NotFoundException when patient not found', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(null);

      await expect(service.update('unknown', { fullName: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  // ── softDelete ────────────────────────────────────────────────────────────

  describe('softDelete', () => {
    it('sets deletedAt on the patient', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(dbPatient);
      mockPrisma.patient.update.mockResolvedValue({ ...dbPatient, deletedAt: new Date() });

      await service.softDelete('pat-1');

      expect(mockPrisma.patient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pat-1' },
          data: { deletedAt: expect.any(Date) },
        }),
      );
    });

    it('throws NotFoundException when patient not found', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(null);

      await expect(service.softDelete('unknown')).rejects.toThrow(NotFoundException);
    });
  });
});
