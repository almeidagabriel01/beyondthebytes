import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  CreatePatient,
  UpdatePatient,
  ListPatientsQuery,
  PatientResponse,
  PatientsListResponse,
} from '@medschedule/shared';

interface PatientRow {
  id: string;
  fullName: string;
  cpf: string;
  phone: string;
  email: string | null;
  birthDate: Date;
  observations: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  createdByName: string;
  createdByEmail: string;
}

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePatient, createdById: string): Promise<PatientResponse> {
    try {
      const patient = await this.prisma.patient.create({
        data: {
          fullName: dto.fullName,
          cpf: dto.cpf,
          phone: dto.phone,
          birthDate: new Date(dto.birthDate),
          email: dto.email ?? null,
          observations: dto.observations ?? null,
          createdById,
        },
        include: { createdBy: { select: { id: true, name: true, email: true } } },
      });
      return this._toResponse(patient);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('CPF já cadastrado');
      }
      throw e;
    }
  }

  async findAll(query: ListPatientsQuery): Promise<PatientsListResponse> {
    const { search, cursor, limit = 20 } = query;

    if (search?.trim()) {
      return this._searchPatients(search.trim(), cursor, limit);
    }

    const patients = await this.prisma.patient.findMany({
      where: {
        deletedAt: null,
        ...(cursor ? { id: { gt: cursor } } : {}),
      },
      include: { createdBy: { select: { id: true, name: true, email: true } } },
      orderBy: [{ fullName: 'asc' }, { id: 'asc' }],
      take: limit + 1,
    });

    const hasMore = patients.length > limit;
    const items = hasMore ? patients.slice(0, limit) : patients;
    const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;

    return {
      items: items.map((p) => this._toResponse(p)),
      nextCursor,
    };
  }

  async findOne(id: string): Promise<PatientResponse> {
    const patient = await this.prisma.patient.findFirst({
      where: { id, deletedAt: null },
      include: { createdBy: { select: { id: true, name: true, email: true } } },
    });
    if (!patient) throw new NotFoundException('Paciente não encontrado');
    return this._toResponse(patient);
  }

  async update(id: string, dto: UpdatePatient): Promise<PatientResponse> {
    await this.findOne(id);

    const patient = await this.prisma.patient.update({
      where: { id },
      data: {
        ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
        ...(dto.cpf !== undefined ? { cpf: dto.cpf } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.birthDate !== undefined ? { birthDate: new Date(dto.birthDate) } : {}),
        ...(dto.email !== undefined ? { email: dto.email ?? null } : {}),
        ...(dto.observations !== undefined ? { observations: dto.observations ?? null } : {}),
      },
      include: { createdBy: { select: { id: true, name: true, email: true } } },
    });
    return this._toResponse(patient);
  }

  async softDelete(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.patient.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async _searchPatients(
    search: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<PatientsListResponse> {
    const digits = search.replace(/\D/g, '');
    const cursorClause = cursor ? Prisma.sql`AND p.id > ${cursor}` : Prisma.sql``;
    const digitClause =
      digits.length > 0
        ? Prisma.sql`OR regexp_replace(p.cpf, '[^0-9]', '', 'g') LIKE ${'%' + digits + '%'}`
        : Prisma.sql``;

    const rows = await this.prisma.$queryRaw<PatientRow[]>(
      Prisma.sql`
        SELECT
          p.id, p."fullName", p.cpf, p.phone, p.email, p."birthDate",
          p.observations, p."createdById", p."createdAt", p."updatedAt", p."deletedAt",
          u.name AS "createdByName", u.email AS "createdByEmail"
        FROM "Patient" p
        LEFT JOIN "User" u ON u.id = p."createdById"
        WHERE p."deletedAt" IS NULL
          AND (
            p."fullName" % ${search}
            OR p.email % ${search}
            ${digitClause}
          )
        ${cursorClause}
        ORDER BY similarity(p."fullName", ${search}) DESC, p.id ASC
        LIMIT ${limit + 1}
      `,
    );

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;

    return {
      items: items.map((r) => this._rawToResponse(r)),
      nextCursor,
    };
  }

  private _toResponse(patient: {
    id: string;
    fullName: string;
    cpf: string;
    phone: string;
    birthDate: Date;
    email: string | null;
    observations: string | null;
    createdAt: Date;
    updatedAt: Date;
    createdBy: { id: string; name: string; email: string };
  }): PatientResponse {
    return {
      id: patient.id,
      fullName: patient.fullName,
      cpf: patient.cpf,
      phone: patient.phone,
      birthDate: patient.birthDate.toISOString().split('T')[0]!,
      email: patient.email,
      observations: patient.observations,
      createdAt: patient.createdAt.toISOString(),
      updatedAt: patient.updatedAt.toISOString(),
      createdBy: patient.createdBy,
    };
  }

  private _rawToResponse(r: PatientRow): PatientResponse {
    return {
      id: r.id,
      fullName: r.fullName,
      cpf: r.cpf,
      phone: r.phone,
      birthDate:
        r.birthDate instanceof Date
          ? r.birthDate.toISOString().split('T')[0]!
          : String(r.birthDate).split('T')[0]!,
      email: r.email,
      observations: r.observations,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt),
      createdBy: {
        id: r.createdById,
        name: r.createdByName,
        email: r.createdByEmail,
      },
    };
  }
}
