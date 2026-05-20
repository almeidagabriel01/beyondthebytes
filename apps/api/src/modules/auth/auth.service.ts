import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'node:crypto';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { env } from '../../config/env';

interface SafeUser {
  id: string;
  email: string;
  role: 'ADMIN' | 'STAFF';
}

interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: SafeUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<SafeUser | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    const isValid = await argon2.verify(user.passwordHash, password);
    if (!isValid) return null;
    return { id: user.id, email: user.email, role: user.role };
  }

  async login(user: SafeUser): Promise<LoginResult> {
    const { accessToken, refreshToken, tokenHash, familyId } = this._issueTokenPair(user);
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        familyId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    return { accessToken, refreshToken, user };
  }

  async refresh(rawRefreshToken: string): Promise<LoginResult> {
    const tokenHash = this._sha256(rawRefreshToken);
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record) {
      const decoded = this.jwtService.decode(rawRefreshToken) as { familyId?: string } | null;
      if (decoded?.familyId) {
        await this.prisma.refreshToken.updateMany({
          where: { familyId: decoded.familyId },
          data: { revokedAt: new Date() },
        });
      }
      throw new UnauthorizedException('Session compromised — please log in again');
    }

    if (record.revokedAt !== null) {
      await this.prisma.refreshToken.updateMany({
        where: { familyId: record.familyId },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token reuse detected — please log in again');
    }

    const safeUser: SafeUser = {
      id: record.user.id,
      email: record.user.email,
      role: record.user.role,
    };
    const {
      accessToken,
      refreshToken: newRaw,
      tokenHash: newHash,
      familyId,
    } = this._issueTokenPair(safeUser, record.familyId);

    await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } });
      await tx.refreshToken.create({
        data: {
          userId: safeUser.id,
          tokenHash: newHash,
          familyId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    });

    return { accessToken, refreshToken: newRaw, user: safeUser };
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private _issueTokenPair(
    user: SafeUser,
    existingFamilyId?: string,
  ): { accessToken: string; refreshToken: string; tokenHash: string; familyId: string } {
    const familyId = existingFamilyId ?? randomUUID();
    const jti = randomUUID();
    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, role: user.role },
      { secret: env().JWT_SECRET, expiresIn: '15m' },
    );
    const refreshToken = this.jwtService.sign(
      { sub: user.id, email: user.email, role: user.role, familyId, jti },
      { secret: env().JWT_REFRESH_SECRET, expiresIn: '7d' },
    );
    return { accessToken, refreshToken, tokenHash: this._sha256(refreshToken), familyId };
  }

  private _sha256(input: string): string {
    return createHash('sha256').update(input).digest('hex');
  }
}
