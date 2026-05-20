import { AppointmentStatus, PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // Use the same password in Playwright tests: TEST_ADMIN_PASSWORD env var or 'Admin@12345'
  const password = process.env['SEED_ADMIN_PASSWORD'] ?? 'Admin@12345';
  const passwordHash = await argon2.hash(password);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@medschedule.local' },
    update: { name: 'Administrador' },
    create: {
      email: 'admin@medschedule.local',
      passwordHash,
      name: 'Administrador',
      role: 'ADMIN',
    },
  });

  console.log(`Seeded admin user: ${admin.id} (${admin.email})`);

  if (process.env['NODE_ENV'] === 'production') {
    console.log('Skipping appointment seed in production');
    return;
  }

  // Get or create a test patient
  const patient = await prisma.patient.upsert({
    where: { cpf: '529.982.247-25' },
    update: {},
    create: {
      fullName: 'Maria Aparecida Silva',
      cpf: '529.982.247-25',
      phone: '(11) 98888-7777',
      birthDate: new Date('1985-03-22'),
      createdById: admin.id,
    },
  });

  console.log(`Seeded test patient: ${patient.id} (${patient.fullName})`);

  // Compute date components for today in UTC so BRT offsets are explicit.
  // BRT = UTC-3, so HH:00 BRT = (HH+3):00 UTC.
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();

  // Helper to build a UTC Date from an explicit UTC hour, with a day offset.
  const utc = (dayOffset: number, utcHour: number): Date =>
    new Date(Date.UTC(y, m, d + dayOffset, utcHour, 0, 0, 0));

  // 09:00 BRT = 12:00 UTC, 10:00 BRT = 13:00 UTC,
  // 14:00 BRT = 17:00 UTC, 15:00 BRT = 18:00 UTC
  const appointments: {
    startsAt: Date;
    status: AppointmentStatus;
    cancelReason?: string;
    cancelledAt?: Date;
  }[] = [
    { startsAt: utc(+1, 12), status: AppointmentStatus.AGENDADO },
    { startsAt: utc(+1, 13), status: AppointmentStatus.CONFIRMADO },
    { startsAt: utc(0, 17), status: AppointmentStatus.AGUARDANDO },
    { startsAt: utc(0, 18), status: AppointmentStatus.EM_ATENDIMENTO },
    { startsAt: utc(-1, 12), status: AppointmentStatus.REALIZADO },
    {
      startsAt: utc(-1, 13),
      status: AppointmentStatus.CANCELADO,
      cancelReason: 'Paciente remarcou',
      cancelledAt: utc(-1, 13),
    },
  ];

  for (const appt of appointments) {
    const existing = await prisma.appointment.findFirst({
      where: { userId: admin.id, startsAt: appt.startsAt },
    });

    if (existing) {
      console.log(
        `Skipping appointment (already exists): ${appt.status} at ${appt.startsAt.toISOString()}`,
      );
      continue;
    }

    const endsAt = new Date(appt.startsAt.getTime() + 30 * 60 * 1000);

    const created = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        userId: admin.id,
        createdById: admin.id,
        startsAt: appt.startsAt,
        endsAt,
        durationMinutes: 30,
        type: 'CONSULTA',
        insurance: 'Particular',
        status: appt.status,
        cancelReason: appt.cancelReason ?? null,
        cancelledAt: appt.cancelledAt ?? null,
      },
    });

    console.log(
      `Seeded appointment: ${created.id} (${appt.status} at ${appt.startsAt.toISOString()})`,
    );
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
