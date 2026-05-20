import { Test, type TestingModule } from '@nestjs/testing';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const ADMIN_EMAIL = 'admin@medschedule.local';
const ADMIN_PASSWORD = process.env['SEED_ADMIN_PASSWORD'] ?? 'Admin@12345';

// A valid CPF for creating test patients
const VALID_CPF = '529.982.247-25';
const VALID_PHONE = '(11) 91234-5678';

// Slots far in the future so they always pass isFutureSlot()
// 07:00 is the clinic open, aligned on the hour — always valid
const FUTURE_SLOT = '2099-06-15T07:00:00-03:00';
// Same day, second slot at 07:30 — for PATCH / alternative slot tests
const FUTURE_SLOT_2 = '2099-06-15T07:30:00-03:00';
// A past slot, but still aligned on 30 min boundary — exercises PAST_SLOT branch
const PAST_SLOT = '2020-06-15T09:00:00-03:00';
// A future slot with :15 minutes — exercises INVALID_SLOT branch
const INVALID_SLOT_FUTURE = '2099-06-15T09:15:00-03:00';

function parseCookies(res: request.Response): string {
  const raw = res.headers['set-cookie'] as string[] | string | undefined;
  if (!raw) return '';
  const cookies = Array.isArray(raw) ? raw : [raw];
  return cookies.map((c) => c.split(';')[0]).join('; ');
}

describe('AppointmentsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookieHeader: string;
  let patientId: string;

  /** Minimal DTO builder — only override what a test cares about */
  function makeDto(
    overrides: Partial<{
      patientId: string;
      startsAt: string;
      durationMinutes: 30 | 45 | 60;
      type: 'CONSULTA' | 'RETORNO' | 'AVALIACAO' | 'PROCEDIMENTO';
      insurance: string;
      value: number;
      observations: string;
    }> = {},
  ) {
    return {
      patientId,
      startsAt: FUTURE_SLOT,
      durationMinutes: 30 as const,
      type: 'CONSULTA' as const,
      insurance: 'Particular',
      ...overrides,
    };
  }

  async function cleanAppointments() {
    // AppointmentEvent has onDelete: Cascade from Appointment, so deleting
    // appointments cascades their events automatically.
    await prisma.appointment.deleteMany({});
  }

  async function cleanAll() {
    await cleanAppointments();
    await prisma.patient.deleteMany({});
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

    expect(loginRes.status).toBe(200);
    cookieHeader = parseCookies(loginRes);
  });

  afterAll(async () => {
    await cleanAll();
    await app.close();
  });

  beforeEach(async () => {
    await cleanAll();

    // Every test needs at least one patient
    const patientRes = await request(app.getHttpServer())
      .post('/patients')
      .set('Cookie', cookieHeader)
      .send({
        fullName: 'Paciente Teste',
        cpf: VALID_CPF,
        phone: VALID_PHONE,
        birthDate: '1990-01-01',
      });

    expect(patientRes.status).toBe(201);
    patientId = patientRes.body.id as string;
  });

  // ── POST /appointments ──────────────────────────────────────────────────────

  describe('POST /appointments', () => {
    it('creates an appointment and returns 201 with correct fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', cookieHeader)
        .send(makeDto());

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        patientId,
        type: 'CONSULTA',
        insurance: 'Particular',
        durationMinutes: 30,
        status: 'AGENDADO',
      });
      expect(typeof res.body.id).toBe('string');
      expect(typeof res.body.startsAt).toBe('string');
      expect(typeof res.body.endsAt).toBe('string');
      expect(res.body.patient).toMatchObject({ id: patientId, fullName: 'Paciente Teste' });
    });

    it('returns 422 INVALID_SLOT when slot minutes are :15', async () => {
      const res = await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', cookieHeader)
        .send(makeDto({ startsAt: INVALID_SLOT_FUTURE }));

      expect(res.status).toBe(422);
      expect(res.body.code).toBe('INVALID_SLOT');
    });

    it('returns 422 PAST_SLOT when slot is in the past', async () => {
      const res = await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', cookieHeader)
        .send(makeDto({ startsAt: PAST_SLOT }));

      expect(res.status).toBe(422);
      expect(res.body.code).toBe('PAST_SLOT');
    });

    it('returns 201 for first booking and 409 SLOT_CONFLICT for duplicate slot', async () => {
      const first = await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', cookieHeader)
        .send(makeDto());

      expect(first.status).toBe(201);

      const second = await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', cookieHeader)
        .send(makeDto());

      expect(second.status).toBe(409);
      expect(second.body.code).toBe('SLOT_CONFLICT');
    });

    it('race condition: 10 parallel POSTs on same slot → exactly 1 succeeds', async () => {
      const responses = await Promise.all(
        Array.from({ length: 10 }).map(() =>
          request(app.getHttpServer())
            .post('/appointments')
            .set('Cookie', cookieHeader)
            .send(makeDto()),
        ),
      );

      const successes = responses.filter((r) => r.status === 201);
      const conflicts = responses.filter((r) => r.status === 409);

      expect(successes).toHaveLength(1);
      expect(conflicts).toHaveLength(9);
      conflicts.forEach((r) => expect(r.body.code).toBe('SLOT_CONFLICT'));
    });

    it('returns 401 without auth', async () => {
      const res = await request(app.getHttpServer()).post('/appointments').send(makeDto());
      expect(res.status).toBe(401);
    });
  });

  // ── POST /appointments/:id/cancel ───────────────────────────────────────────

  describe('POST /appointments/:id/cancel', () => {
    it('cancels an appointment and returns 200 with status CANCELADO', async () => {
      const created = await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', cookieHeader)
        .send(makeDto());
      expect(created.status).toBe(201);

      const res = await request(app.getHttpServer())
        .post(`/appointments/${created.body.id}/cancel`)
        .set('Cookie', cookieHeader)
        .send({ reason: 'Paciente solicitou cancelamento' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('CANCELADO');
      expect(res.body.cancelReason).toBe('Paciente solicitou cancelamento');
      expect(typeof res.body.cancelledAt).toBe('string');
    });

    it('returns 422 TERMINAL_STATUS when cancelling an already-cancelled appointment', async () => {
      const created = await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', cookieHeader)
        .send(makeDto());
      expect(created.status).toBe(201);

      const first = await request(app.getHttpServer())
        .post(`/appointments/${created.body.id}/cancel`)
        .set('Cookie', cookieHeader)
        .send({ reason: 'Primeiro cancelamento' });
      expect(first.status).toBe(200);

      const second = await request(app.getHttpServer())
        .post(`/appointments/${created.body.id}/cancel`)
        .set('Cookie', cookieHeader)
        .send({ reason: 'Segundo cancelamento' });

      expect(second.status).toBe(422);
      expect(second.body.code).toBe('TERMINAL_STATUS');
    });
  });

  // ── GET /appointments/month-summary ────────────────────────────────────────

  describe('GET /appointments/month-summary', () => {
    it('returns 200 with an array of {date, counts} items', async () => {
      // Create one appointment so there is at least one entry to return
      const created = await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', cookieHeader)
        .send(makeDto());
      expect(created.status).toBe(201);

      const res = await request(app.getHttpServer())
        .get('/appointments/month-summary')
        .set('Cookie', cookieHeader)
        .query({ from: '2099-06-01', to: '2099-06-30' });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const item = res.body[0] as { date: string; counts: Record<string, number> };
      expect(typeof item.date).toBe('string');
      expect(typeof item.counts).toBe('object');
    });

    it('returns 401 without auth', async () => {
      const res = await request(app.getHttpServer())
        .get('/appointments/month-summary')
        .query({ from: '2099-06-01', to: '2099-06-30' });

      expect(res.status).toBe(401);
    });
  });

  // ── GET /appointments ───────────────────────────────────────────────────────

  describe('GET /appointments', () => {
    it('returns 200 with an array filtered by date', async () => {
      const created = await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', cookieHeader)
        .send(makeDto());
      expect(created.status).toBe(201);

      const res = await request(app.getHttpServer())
        .get('/appointments')
        .set('Cookie', cookieHeader)
        .query({ date: '2099-06-15' });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect((res.body as unknown[]).length).toBeGreaterThan(0);
    });

    it('returns 401 without auth', async () => {
      const res = await request(app.getHttpServer()).get('/appointments');
      expect(res.status).toBe(401);
    });
  });

  // ── PATCH /appointments/:id ─────────────────────────────────────────────────

  describe('PATCH /appointments/:id', () => {
    it('updates an appointment field and returns 200', async () => {
      const created = await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', cookieHeader)
        .send(makeDto({ insurance: 'Unimed' }));
      expect(created.status).toBe(201);

      const res = await request(app.getHttpServer())
        .patch(`/appointments/${created.body.id}`)
        .set('Cookie', cookieHeader)
        .send({ insurance: 'Amil' });

      expect(res.status).toBe(200);
      expect(res.body.insurance).toBe('Amil');
    });

    it('moves appointment to a different slot and returns 200', async () => {
      const created = await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', cookieHeader)
        .send(makeDto());
      expect(created.status).toBe(201);

      const res = await request(app.getHttpServer())
        .patch(`/appointments/${created.body.id}`)
        .set('Cookie', cookieHeader)
        .send({ startsAt: FUTURE_SLOT_2 });

      expect(res.status).toBe(200);
      // endsAt should be 30 min after FUTURE_SLOT_2 (07:30 + 30 min = 08:00)
      expect(new Date(res.body.startsAt as string).getTime()).toBe(
        new Date(FUTURE_SLOT_2).getTime(),
      );
    });
  });
});
