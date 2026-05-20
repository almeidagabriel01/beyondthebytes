import { Test, type TestingModule } from '@nestjs/testing';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const ADMIN_EMAIL = 'admin@medschedule.local';
const ADMIN_PASSWORD = process.env['SEED_ADMIN_PASSWORD'] ?? 'Admin@12345';

const VALID_CPF = '529.982.247-25';
const VALID_PHONE = '(11) 91234-5678';

function parseCookies(res: request.Response): string {
  const raw = res.headers['set-cookie'] as string[] | string | undefined;
  if (!raw) return '';
  const cookies = Array.isArray(raw) ? raw : [raw];
  return cookies.map((c) => c.split(';')[0]).join('; ');
}

describe('PatientsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookieHeader: string;

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
    await prisma.patient.deleteMany({});
    await app.close();
  });

  beforeEach(async () => {
    await prisma.patient.deleteMany({});
  });

  // ── POST /patients ─────────────────────────────────────────────────────────

  describe('POST /patients', () => {
    it('creates a patient and returns 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/patients')
        .set('Cookie', cookieHeader)
        .send({
          fullName: 'Maria Oliveira',
          cpf: VALID_CPF,
          phone: VALID_PHONE,
          birthDate: '1985-03-20',
          email: 'maria@email.com',
        });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        fullName: 'Maria Oliveira',
        cpf: '52998224725',
      });
    });

    it('returns 409 on duplicate CPF', async () => {
      const dto = {
        fullName: 'Maria Oliveira',
        cpf: VALID_CPF,
        phone: VALID_PHONE,
        birthDate: '1985-03-20',
      };
      await request(app.getHttpServer()).post('/patients').set('Cookie', cookieHeader).send(dto);

      const res = await request(app.getHttpServer())
        .post('/patients')
        .set('Cookie', cookieHeader)
        .send({ ...dto, fullName: 'Outro Nome' });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/CPF/i);
    });

    it('returns 400 on invalid CPF', async () => {
      const res = await request(app.getHttpServer())
        .post('/patients')
        .set('Cookie', cookieHeader)
        .send({
          fullName: 'Teste',
          cpf: '111.111.111-11',
          phone: VALID_PHONE,
          birthDate: '1990-01-01',
        });

      expect(res.status).toBe(400);
    });

    it('returns 401 without auth', async () => {
      const res = await request(app.getHttpServer())
        .post('/patients')
        .send({ fullName: 'X', cpf: VALID_CPF, phone: VALID_PHONE, birthDate: '1990-01-01' });

      expect(res.status).toBe(401);
    });
  });

  // ── GET /patients ──────────────────────────────────────────────────────────

  describe('GET /patients', () => {
    it('returns paginated list', async () => {
      await request(app.getHttpServer())
        .post('/patients')
        .set('Cookie', cookieHeader)
        .send({
          fullName: 'Ana Lima',
          cpf: VALID_CPF,
          phone: VALID_PHONE,
          birthDate: '1990-01-01',
        });

      const res = await request(app.getHttpServer()).get('/patients').set('Cookie', cookieHeader);

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.nextCursor).toBeNull();
    });

    it('returns 401 without auth', async () => {
      const res = await request(app.getHttpServer()).get('/patients');
      expect(res.status).toBe(401);
    });
  });

  // ── GET /patients/:id ──────────────────────────────────────────────────────

  describe('GET /patients/:id', () => {
    it('returns patient detail', async () => {
      const created = await request(app.getHttpServer())
        .post('/patients')
        .set('Cookie', cookieHeader)
        .send({
          fullName: 'Carlos Souza',
          cpf: VALID_CPF,
          phone: VALID_PHONE,
          birthDate: '1975-07-10',
        });

      const res = await request(app.getHttpServer())
        .get(`/patients/${created.body.id}`)
        .set('Cookie', cookieHeader);

      expect(res.status).toBe(200);
      expect(res.body.fullName).toBe('Carlos Souza');
    });

    it('returns 404 for unknown id', async () => {
      const res = await request(app.getHttpServer())
        .get('/patients/non-existent-id')
        .set('Cookie', cookieHeader);

      expect(res.status).toBe(404);
    });
  });

  // ── PATCH /patients/:id ────────────────────────────────────────────────────

  describe('PATCH /patients/:id', () => {
    it('updates a patient', async () => {
      const created = await request(app.getHttpServer())
        .post('/patients')
        .set('Cookie', cookieHeader)
        .send({
          fullName: 'Original',
          cpf: VALID_CPF,
          phone: VALID_PHONE,
          birthDate: '1990-01-01',
        });

      const res = await request(app.getHttpServer())
        .patch(`/patients/${created.body.id}`)
        .set('Cookie', cookieHeader)
        .send({ fullName: 'Atualizado' });

      expect(res.status).toBe(200);
      expect(res.body.fullName).toBe('Atualizado');
    });
  });

  // ── DELETE /patients/:id ───────────────────────────────────────────────────

  describe('DELETE /patients/:id', () => {
    it('soft-deletes patient and returns 204', async () => {
      const created = await request(app.getHttpServer())
        .post('/patients')
        .set('Cookie', cookieHeader)
        .send({
          fullName: 'Para Deletar',
          cpf: VALID_CPF,
          phone: VALID_PHONE,
          birthDate: '1990-01-01',
        });

      const deleteRes = await request(app.getHttpServer())
        .delete(`/patients/${created.body.id}`)
        .set('Cookie', cookieHeader);

      expect(deleteRes.status).toBe(204);

      const getRes = await request(app.getHttpServer())
        .get(`/patients/${created.body.id}`)
        .set('Cookie', cookieHeader);

      expect(getRes.status).toBe(404);
    });
  });
});
