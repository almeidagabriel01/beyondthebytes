import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';

// Mock argon2 at module level — never call real crypto in unit tests
jest.mock('argon2');
import * as argon2 from 'argon2';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn(),
  verify: jest.fn(),
  decode: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ── validateUser ───────────────────────────────────────────────────────────

  describe('validateUser', () => {
    const email = 'admin@medschedule.local';
    const password = 'Admin@12345';
    const dbUser = {
      id: 'cuid-123',
      email,
      name: 'Administrador',
      passwordHash: '$argon2id$hashed',
      role: 'ADMIN' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('returns safe user when credentials are valid', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(dbUser);
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser(email, password);

      expect(result).toEqual({
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
      });
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('returns null when user is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser(email, password);

      expect(result).toBeNull();
      expect(argon2.verify).not.toHaveBeenCalled();
    });

    it('returns null when password does not match', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(dbUser);
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser(email, 'WrongPassword');

      expect(result).toBeNull();
    });
  });

  // ── login ──────────────────────────────────────────────────────────────────

  describe('login', () => {
    const userPayload = {
      id: 'cuid-123',
      email: 'admin@medschedule.local',
      name: 'Administrador',
      role: 'ADMIN' as const,
    };

    it('returns accessToken, refreshToken, and safe user shape', async () => {
      mockJwtService.sign
        .mockReturnValueOnce('access-jwt-token') // first call: access token
        .mockReturnValueOnce('refresh-jwt-token'); // second call: refresh token
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await service.login(userPayload);

      expect(result).toHaveProperty('accessToken', 'access-jwt-token');
      expect(result).toHaveProperty('refreshToken', 'refresh-jwt-token');
      expect(result.user).toEqual({
        id: userPayload.id,
        email: userPayload.email,
        name: userPayload.name,
        role: userPayload.role,
      });
    });

    it('persists a hashed refresh token row in the DB', async () => {
      mockJwtService.sign.mockReturnValueOnce('access-jwt').mockReturnValueOnce('raw-refresh-jwt');
      mockPrisma.refreshToken.create.mockResolvedValue({});

      await service.login(userPayload);

      expect(mockPrisma.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: userPayload.id,
            tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/), // SHA-256 hex
          }),
        }),
      );
    });
  });

  // ── refresh ────────────────────────────────────────────────────────────────

  describe('refresh', () => {
    const rawToken = 'valid-refresh-jwt';
    const tokenRecord = {
      id: 'token-id',
      userId: 'cuid-123',
      familyId: 'family-uuid',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      user: {
        id: 'cuid-123',
        email: 'admin@medschedule.local',
        name: 'Administrador',
        role: 'ADMIN' as const,
      },
    };

    it('rotates tokens on valid refresh — returns new accessToken and refreshToken', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(tokenRecord);
      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
      );
      mockPrisma.refreshToken.update.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({});
      mockJwtService.sign
        .mockReturnValueOnce('new-access-jwt')
        .mockReturnValueOnce('new-refresh-jwt');

      const result = await service.refresh(rawToken);

      expect(result).toHaveProperty('accessToken', 'new-access-jwt');
      expect(result).toHaveProperty('refreshToken', 'new-refresh-jwt');
      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: tokenRecord.id },
          data: { revokedAt: expect.any(Date) },
        }),
      );
    });

    it('nuclear-revokes family when token hash is not found (stolen token reuse)', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);
      mockJwtService.decode.mockReturnValue({ familyId: 'family-uuid' });

      await expect(service.refresh(rawToken)).rejects.toThrow(UnauthorizedException);

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { familyId: 'family-uuid' },
          data: { revokedAt: expect.any(Date) },
        }),
      );
    });

    it('nuclear-revokes family when token is found but already revoked', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        ...tokenRecord,
        revokedAt: new Date(),
      });

      await expect(service.refresh(rawToken)).rejects.toThrow(UnauthorizedException);

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { familyId: tokenRecord.familyId } }),
      );
    });
  });

  // ── logout ─────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('revokes all active refresh tokens for the user', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 2 });

      await service.logout('cuid-123');

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'cuid-123', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });
});
