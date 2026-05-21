import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AppointmentStatus, type Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  ClinicalNoteResponse,
  CreateClinicalNote,
  UpdateClinicalNote,
} from '@medschedule/shared';

type NoteRow = {
  id: string;
  appointmentId: string;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; name: string };
  revisions: Array<{ id: string; content: unknown; createdAt: Date }>;
};

const REVISIONS_INCLUDE = {
  author: { select: { id: true, name: true } },
  revisions: {
    orderBy: { createdAt: 'desc' as const },
    select: { id: true, content: true, createdAt: true },
  },
} as const;

@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) {}

  async listByAppointment(appointmentId: string, userId: string): Promise<ClinicalNoteResponse[]> {
    await this.assertAppointmentAccessible(appointmentId, userId);

    const notes = (await this.prisma.clinicalNote.findMany({
      where: { appointmentId },
      orderBy: { createdAt: 'asc' },
      include: REVISIONS_INCLUDE,
    })) as unknown as NoteRow[];

    return notes.map(this.toResponse);
  }

  async create(
    appointmentId: string,
    dto: CreateClinicalNote,
    authorId: string,
  ): Promise<ClinicalNoteResponse> {
    const appt = await this.assertAppointmentAccessible(appointmentId, authorId);
    if (appt.status !== AppointmentStatus.REALIZADO) {
      throw new UnprocessableEntityException({
        code: 'NOTE_REQUIRES_REALIZADO',
        message: 'Observações clínicas só podem ser criadas em consultas realizadas.',
      });
    }

    const created = (await this.prisma.clinicalNote.create({
      data: {
        appointmentId,
        authorId,
        revisions: {
          create: { content: dto.content as Prisma.InputJsonValue },
        },
      },
      include: REVISIONS_INCLUDE,
    })) as unknown as NoteRow;

    return this.toResponse(created);
  }

  async addRevision(
    noteId: string,
    dto: UpdateClinicalNote,
    callerId: string,
  ): Promise<ClinicalNoteResponse> {
    const existing = (await this.prisma.clinicalNote.findFirst({
      where: { id: noteId },
      include: REVISIONS_INCLUDE,
    })) as unknown as NoteRow | null;

    if (!existing) throw new NotFoundException('Observação não encontrada');
    if (existing.authorId !== callerId) {
      throw new ForbiddenException('Apenas o autor pode editar esta observação.');
    }

    const updated = (await this.prisma.$transaction(async (tx) => {
      await tx.clinicalNoteRevision.create({
        data: { noteId, content: dto.content as Prisma.InputJsonValue },
      });
      // Empty data with @updatedAt triggers a new updatedAt timestamp.
      await tx.clinicalNote.update({ where: { id: noteId }, data: {} });
      return tx.clinicalNote.findFirst({
        where: { id: noteId },
        include: REVISIONS_INCLUDE,
      });
    })) as unknown as NoteRow;

    return this.toResponse(updated);
  }

  private async assertAppointmentAccessible(
    appointmentId: string,
    userId: string,
  ): Promise<{ id: string; status: AppointmentStatus }> {
    const appt = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, userId },
      select: { id: true, status: true },
    });
    if (!appt) throw new NotFoundException('Consulta não encontrada');
    return appt as { id: string; status: AppointmentStatus };
  }

  private toResponse = (row: NoteRow): ClinicalNoteResponse => ({
    id: row.id,
    appointmentId: row.appointmentId,
    authorId: row.authorId,
    authorName: row.author.name,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    revisions: row.revisions.map((r) => ({
      id: r.id,
      content: r.content as { type: 'doc' },
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
