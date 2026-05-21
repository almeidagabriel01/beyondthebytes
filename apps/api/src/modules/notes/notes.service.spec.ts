import { Test, type TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { NotesService } from './notes.service';
import { PrismaService } from '../../prisma/prisma.service';

const TIPTAP_DOC = {
  type: 'doc' as const,
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Paciente estável.' }] }],
};

const mockPrisma = {
  appointment: { findFirst: jest.fn() },
  clinicalNote: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  clinicalNoteRevision: { create: jest.fn() },
  $transaction: jest.fn((arg: unknown): Promise<unknown> => {
    if (typeof arg === 'function') {
      return (arg as (tx: unknown) => Promise<unknown>)(mockPrisma);
    }
    return Promise.all(arg as Promise<unknown>[]);
  }),
};

const baseAppt = { id: 'appt-1', userId: 'user-1', status: 'REALIZADO' };

const baseNote = {
  id: 'note-1',
  appointmentId: 'appt-1',
  authorId: 'user-1',
  createdAt: new Date('2026-05-20T10:00:00Z'),
  updatedAt: new Date('2026-05-20T10:00:00Z'),
  author: { id: 'user-1', name: 'Dr. Alice' },
  revisions: [{ id: 'rev-1', content: TIPTAP_DOC, createdAt: new Date('2026-05-20T10:00:00Z') }],
};

describe('NotesService', () => {
  let service: NotesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotesService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(NotesService);
  });

  describe('listByAppointment', () => {
    it('throws NotFoundException when appointment does not exist or not owned', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue(null);
      await expect(service.listByAppointment('appt-x', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns notes with full revisions list (newest first) when appointment is accessible', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue(baseAppt);
      mockPrisma.clinicalNote.findMany.mockResolvedValue([baseNote]);

      const result = await service.listByAppointment('appt-1', 'user-1');

      expect(result).toHaveLength(1);
      const first = result[0];
      expect(first).toBeDefined();
      expect(first?.id).toBe('note-1');
      expect(first?.revisions).toHaveLength(1);
      expect(first?.revisions[0]?.id).toBe('rev-1');
      expect(first?.authorName).toBe('Dr. Alice');
      expect(typeof first?.createdAt).toBe('string');
    });

    it('scopes appointment lookup by userId (authz)', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue(null);
      await service.listByAppointment('appt-1', 'user-7').catch(() => undefined);
      const args = mockPrisma.appointment.findFirst.mock.calls[0]?.[0] as {
        where: { id: string; userId: string };
      };
      expect(args.where).toMatchObject({ id: 'appt-1', userId: 'user-7' });
    });
  });

  describe('create', () => {
    it('throws NotFoundException when appointment not found', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue(null);
      await expect(service.create('appt-x', { content: TIPTAP_DOC }, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws UnprocessableEntityException when appointment status != REALIZADO', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue({ ...baseAppt, status: 'AGENDADO' });

      const err = await service
        .create('appt-1', { content: TIPTAP_DOC }, 'user-1')
        .catch((e: unknown) => e);

      expect(err).toBeInstanceOf(UnprocessableEntityException);
      expect((err as UnprocessableEntityException).getResponse()).toMatchObject({
        code: 'NOTE_REQUIRES_REALIZADO',
      });
    });

    it('creates note + first revision atomically when REALIZADO', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue(baseAppt);
      mockPrisma.clinicalNote.create.mockResolvedValue(baseNote);

      const result = await service.create('appt-1', { content: TIPTAP_DOC }, 'user-1');

      expect(result.id).toBe('note-1');
      expect(result.revisions[0]?.id).toBe('rev-1');

      const createArg = mockPrisma.clinicalNote.create.mock.calls[0]?.[0] as {
        data: {
          appointmentId: string;
          authorId: string;
          revisions: { create: { content: unknown } };
        };
      };
      expect(createArg.data.appointmentId).toBe('appt-1');
      expect(createArg.data.authorId).toBe('user-1');
      expect(createArg.data.revisions.create).toMatchObject({ content: TIPTAP_DOC });
    });
  });

  describe('addRevision', () => {
    it('throws NotFoundException when note does not exist', async () => {
      mockPrisma.clinicalNote.findFirst.mockResolvedValue(null);
      await expect(
        service.addRevision('note-x', { content: TIPTAP_DOC }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when caller is not the author', async () => {
      mockPrisma.clinicalNote.findFirst.mockResolvedValue(baseNote);
      await expect(
        service.addRevision('note-1', { content: TIPTAP_DOC }, 'user-2'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('appends new revision atomically with note updatedAt touch', async () => {
      const newDoc = { type: 'doc' as const, content: [] };
      const newRev = {
        id: 'rev-2',
        content: newDoc,
        createdAt: new Date('2026-05-20T11:00:00Z'),
      };
      mockPrisma.clinicalNote.findFirst.mockResolvedValueOnce(baseNote).mockResolvedValueOnce({
        ...baseNote,
        updatedAt: newRev.createdAt,
        revisions: [newRev, baseNote.revisions[0]],
      });
      mockPrisma.clinicalNoteRevision.create.mockResolvedValue(newRev);

      const result = await service.addRevision('note-1', { content: newDoc }, 'user-1');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result.revisions[0]?.id).toBe('rev-2');
      expect(result.revisions[1]?.id).toBe('rev-1');
    });
  });
});
