import { AppointmentStatus, AppointmentType, PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

interface PatientSeed {
  fullName: string;
  cpf: string; // formatted: 000.000.000-00
  phone: string;
  birthDate: Date;
}

// All CPFs validated to pass the official check-digit algorithm (see packages/shared/src/validators/cpf.ts).
const PATIENTS: PatientSeed[] = [
  // Existing patient — kept first so the original seed is preserved
  {
    fullName: 'Maria Aparecida Silva',
    cpf: '529.982.247-25',
    phone: '(11) 98888-7777',
    birthDate: new Date('1985-03-22'),
  },
  {
    fullName: 'João Pedro Almeida',
    cpf: '111.444.777-35',
    phone: '(11) 97777-1010',
    birthDate: new Date('1979-11-05'),
  },
  {
    fullName: 'Ana Carolina Souza',
    cpf: '390.533.447-05',
    phone: '(11) 96655-4433',
    birthDate: new Date('1992-07-18'),
  },
  {
    fullName: 'Carlos Eduardo Lima',
    cpf: '123.456.789-09',
    phone: '(11) 95544-3322',
    birthDate: new Date('1968-02-14'),
  },
  {
    fullName: 'Beatriz Oliveira',
    cpf: '012.345.678-90',
    phone: '(11) 94433-2211',
    birthDate: new Date('1995-09-30'),
  },
  {
    fullName: 'Rafael Marques',
    cpf: '453.178.287-91',
    phone: '(11) 93322-1100',
    birthDate: new Date('1983-04-12'),
  },
];

interface AppointmentSeed {
  patientIdx: number;
  dayOffset: number;
  utcHour: number; // BRT = UTC-3, so 12 UTC = 09 BRT
  utcMinute: number; // 0 or 30
  durationMinutes: 30 | 45 | 60;
  type: AppointmentType;
  insurance: string;
  status: AppointmentStatus;
  value?: number;
  observations?: string;
  cancelReason?: string;
}

// 30 appointments spread over 14 days (today ± 7), realistic mix.
// Times in BRT working hours 07:00–18:30 → UTC 10:00–21:30.
// Past dates (dayOffset < 0) get REALIZADO; some CANCELADO sprinkled.
const APPOINTMENT_SEEDS: AppointmentSeed[] = [
  // ── Today (7 entries — populated dashboard) ──────────────────────────────
  // Existing seed already has today @ 17:00 UTC (AGUARDANDO) and 18:00 UTC (EM_ATENDIMENTO). Avoid those slots.
  {
    patientIdx: 0,
    dayOffset: 0,
    utcHour: 10,
    utcMinute: 0,
    durationMinutes: 30,
    type: 'CONSULTA',
    insurance: 'Particular',
    value: 250,
    status: 'REALIZADO',
  },
  {
    patientIdx: 1,
    dayOffset: 0,
    utcHour: 11,
    utcMinute: 0,
    durationMinutes: 45,
    type: 'RETORNO',
    insurance: 'Unimed',
    status: 'REALIZADO',
  },
  {
    patientIdx: 2,
    dayOffset: 0,
    utcHour: 13,
    utcMinute: 0,
    durationMinutes: 30,
    type: 'CONSULTA',
    insurance: 'Bradesco Saúde',
    status: 'REALIZADO',
  },
  {
    patientIdx: 3,
    dayOffset: 0,
    utcHour: 14,
    utcMinute: 0,
    durationMinutes: 30,
    type: 'CONSULTA',
    insurance: 'SulAmérica',
    status: 'CONFIRMADO',
  },
  {
    patientIdx: 4,
    dayOffset: 0,
    utcHour: 15,
    utcMinute: 30,
    durationMinutes: 60,
    type: 'PROCEDIMENTO',
    insurance: 'Particular',
    value: 450,
    status: 'CONFIRMADO',
  },
  {
    patientIdx: 5,
    dayOffset: 0,
    utcHour: 19,
    utcMinute: 0,
    durationMinutes: 30,
    type: 'AVALIACAO',
    insurance: 'Amil',
    status: 'AGENDADO',
  },
  {
    patientIdx: 1,
    dayOffset: 0,
    utcHour: 20,
    utcMinute: 0,
    durationMinutes: 30,
    type: 'RETORNO',
    insurance: 'Particular',
    value: 150,
    status: 'AGENDADO',
  },

  // ── Past 7 days (mostly REALIZADO, some CANCELADO) ───────────────────────
  {
    patientIdx: 0,
    dayOffset: -7,
    utcHour: 12,
    utcMinute: 0,
    durationMinutes: 45,
    type: 'CONSULTA',
    insurance: 'Particular',
    value: 300,
    status: 'REALIZADO',
  },
  {
    patientIdx: 2,
    dayOffset: -6,
    utcHour: 13,
    utcMinute: 30,
    durationMinutes: 30,
    type: 'RETORNO',
    insurance: 'Unimed',
    status: 'REALIZADO',
  },
  {
    patientIdx: 3,
    dayOffset: -5,
    utcHour: 14,
    utcMinute: 0,
    durationMinutes: 30,
    type: 'CONSULTA',
    insurance: 'Bradesco Saúde',
    status: 'REALIZADO',
  },
  {
    patientIdx: 4,
    dayOffset: -5,
    utcHour: 17,
    utcMinute: 0,
    durationMinutes: 60,
    type: 'PROCEDIMENTO',
    insurance: 'Particular',
    value: 450,
    status: 'REALIZADO',
  },
  {
    patientIdx: 5,
    dayOffset: -4,
    utcHour: 11,
    utcMinute: 30,
    durationMinutes: 30,
    type: 'AVALIACAO',
    insurance: 'Amil',
    status: 'CANCELADO',
    cancelReason: 'Paciente desmarcou no dia',
  },
  {
    patientIdx: 1,
    dayOffset: -4,
    utcHour: 13,
    utcMinute: 0,
    durationMinutes: 45,
    type: 'CONSULTA',
    insurance: 'SulAmérica',
    status: 'REALIZADO',
  },
  {
    patientIdx: 2,
    dayOffset: -3,
    utcHour: 14,
    utcMinute: 30,
    durationMinutes: 30,
    type: 'RETORNO',
    insurance: 'Unimed',
    status: 'REALIZADO',
  },
  {
    patientIdx: 3,
    dayOffset: -3,
    utcHour: 18,
    utcMinute: 0,
    durationMinutes: 30,
    type: 'CONSULTA',
    insurance: 'Particular',
    value: 250,
    status: 'REALIZADO',
  },
  {
    patientIdx: 0,
    dayOffset: -2,
    utcHour: 12,
    utcMinute: 0,
    durationMinutes: 30,
    type: 'CONSULTA',
    insurance: 'Particular',
    value: 250,
    status: 'CANCELADO',
    cancelReason: 'Reagendamento solicitado por convênio',
  },
  {
    patientIdx: 4,
    dayOffset: -2,
    utcHour: 16,
    utcMinute: 0,
    durationMinutes: 45,
    type: 'AVALIACAO',
    insurance: 'Bradesco Saúde',
    status: 'REALIZADO',
  },
  // Existing seed @ dayOffset -1 has 12:00 UTC + 13:00 UTC (CANCELADO). Avoid 12:00-13:30 UTC window.
  {
    patientIdx: 5,
    dayOffset: -1,
    utcHour: 14,
    utcMinute: 0,
    durationMinutes: 30,
    type: 'RETORNO',
    insurance: 'Particular',
    value: 150,
    status: 'REALIZADO',
  },
  {
    patientIdx: 1,
    dayOffset: -1,
    utcHour: 15,
    utcMinute: 0,
    durationMinutes: 30,
    type: 'CONSULTA',
    insurance: 'Amil',
    status: 'REALIZADO',
  },

  // ── Next 7 days (future appointments) ───────────────────────────────────
  // Existing seed @ dayOffset +1 has 12:00 UTC (AGENDADO) + 13:00 UTC (CONFIRMADO). Avoid 12:00-13:30 UTC.
  {
    patientIdx: 2,
    dayOffset: 1,
    utcHour: 11,
    utcMinute: 0,
    durationMinutes: 30,
    type: 'RETORNO',
    insurance: 'Unimed',
    status: 'CONFIRMADO',
  },
  {
    patientIdx: 3,
    dayOffset: 1,
    utcHour: 14,
    utcMinute: 0,
    durationMinutes: 45,
    type: 'CONSULTA',
    insurance: 'SulAmérica',
    status: 'AGENDADO',
  },
  {
    patientIdx: 4,
    dayOffset: 1,
    utcHour: 17,
    utcMinute: 30,
    durationMinutes: 60,
    type: 'PROCEDIMENTO',
    insurance: 'Particular',
    value: 450,
    status: 'CONFIRMADO',
  },
  {
    patientIdx: 0,
    dayOffset: 2,
    utcHour: 13,
    utcMinute: 0,
    durationMinutes: 30,
    type: 'CONSULTA',
    insurance: 'Particular',
    value: 300,
    status: 'AGENDADO',
  },
  {
    patientIdx: 5,
    dayOffset: 2,
    utcHour: 15,
    utcMinute: 0,
    durationMinutes: 30,
    type: 'AVALIACAO',
    insurance: 'Amil',
    status: 'AGENDADO',
    observations: 'Trazer exames anteriores',
  },
  {
    patientIdx: 1,
    dayOffset: 3,
    utcHour: 11,
    utcMinute: 0,
    durationMinutes: 30,
    type: 'RETORNO',
    insurance: 'Bradesco Saúde',
    status: 'CONFIRMADO',
  },
  {
    patientIdx: 2,
    dayOffset: 4,
    utcHour: 14,
    utcMinute: 30,
    durationMinutes: 45,
    type: 'CONSULTA',
    insurance: 'Particular',
    value: 250,
    status: 'AGENDADO',
  },
  {
    patientIdx: 3,
    dayOffset: 4,
    utcHour: 18,
    utcMinute: 0,
    durationMinutes: 30,
    type: 'CONSULTA',
    insurance: 'SulAmérica',
    status: 'CANCELADO',
    cancelReason: 'Paciente em viagem',
  },
  {
    patientIdx: 4,
    dayOffset: 5,
    utcHour: 13,
    utcMinute: 0,
    durationMinutes: 60,
    type: 'PROCEDIMENTO',
    insurance: 'Particular',
    value: 450,
    status: 'AGENDADO',
  },
  {
    patientIdx: 5,
    dayOffset: 6,
    utcHour: 12,
    utcMinute: 30,
    durationMinutes: 30,
    type: 'CONSULTA',
    insurance: 'Amil',
    status: 'AGENDADO',
  },
  {
    patientIdx: 0,
    dayOffset: 7,
    utcHour: 15,
    utcMinute: 30,
    durationMinutes: 45,
    type: 'RETORNO',
    insurance: 'Particular',
    value: 250,
    status: 'AGENDADO',
  },
];

async function main(): Promise<void> {
  // Use the same password in Playwright tests: TEST_ADMIN_PASSWORD env var or 'Admin@12345'
  const password = process.env['SEED_ADMIN_PASSWORD'] ?? 'Admin@12345';
  const passwordHash = await argon2.hash(password);

  // ui-avatars.com is more reliable than pravatar.cc on restricted networks
  // and generates a deterministic initials-based avatar.
  const adminAvatarUrl =
    'https://ui-avatars.com/api/?name=Administrador&background=4648d4&color=fff&size=150&bold=true';

  const admin = await prisma.user.upsert({
    where: { email: 'admin@medschedule.local' },
    update: { name: 'Administrador', avatarUrl: adminAvatarUrl },
    create: {
      email: 'admin@medschedule.local',
      passwordHash,
      name: 'Administrador',
      role: 'ADMIN',
      avatarUrl: adminAvatarUrl,
    },
  });

  console.log(`Seeded admin user: ${admin.id} (${admin.email})`);

  if (process.env['NODE_ENV'] === 'production') {
    console.log('Skipping appointment seed in production');
    return;
  }

  // Upsert patients (idempotent by cpf)
  const patientIds: string[] = [];
  for (const p of PATIENTS) {
    const patient = await prisma.patient.upsert({
      where: { cpf: p.cpf },
      update: {},
      create: {
        fullName: p.fullName,
        cpf: p.cpf,
        phone: p.phone,
        birthDate: p.birthDate,
        createdById: admin.id,
      },
    });
    patientIds.push(patient.id);
    console.log(`Seeded patient: ${patient.id} (${patient.fullName})`);
  }

  // Compute date components for today in UTC so BRT offsets are explicit.
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();

  const utc = (dayOffset: number, utcHour: number, utcMinute: number): Date =>
    new Date(Date.UTC(y, m, d + dayOffset, utcHour, utcMinute, 0, 0));

  let createdCount = 0;
  let skippedCount = 0;

  for (const a of APPOINTMENT_SEEDS) {
    const startsAt = utc(a.dayOffset, a.utcHour, a.utcMinute);
    const patientId = patientIds[a.patientIdx];

    if (!patientId) {
      throw new Error(`Invalid patientIdx ${a.patientIdx}`);
    }

    const endsAt = new Date(startsAt.getTime() + a.durationMinutes * 60 * 1000);

    // Skip if any appointment overlaps this slot for the same user (matches the DB exclusion constraint).
    const overlap = await prisma.appointment.findFirst({
      where: {
        userId: admin.id,
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    });

    if (overlap) {
      skippedCount += 1;
      continue;
    }

    const isParticular = a.insurance === 'Particular';

    await prisma.appointment.create({
      data: {
        patientId,
        userId: admin.id,
        createdById: admin.id,
        startsAt,
        endsAt,
        durationMinutes: a.durationMinutes,
        type: a.type,
        insurance: a.insurance,
        value: isParticular && a.value != null ? a.value : null,
        observations: a.observations ?? null,
        status: a.status,
        cancelReason: a.cancelReason ?? null,
        cancelledAt: a.cancelReason ? startsAt : null,
      },
    });

    createdCount += 1;
  }

  console.log(
    `Appointment seed complete: created=${createdCount}, skipped=${skippedCount} (already existed)`,
  );

  // Summary counts
  const totalPatients = await prisma.patient.count();
  const totalAppointments = await prisma.appointment.count();
  const byStatus = await prisma.appointment.groupBy({
    by: ['status'],
    _count: { _all: true },
  });

  console.log(`\n=== Seed summary ===`);
  console.log(`Patients: ${totalPatients}`);
  console.log(`Appointments: ${totalAppointments}`);
  for (const row of byStatus) {
    console.log(`  ${row.status}: ${row._count._all}`);
  }
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
