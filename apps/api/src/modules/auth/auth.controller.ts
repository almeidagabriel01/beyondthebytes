import {
  Controller,
  Post,
  Get,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  UnauthorizedException,
  Body,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Public } from '../../common/decorators/public.decorator';
import { LoginRequestSchema, type LoginRequest } from '@medschedule/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { env } from '../../config/env';

interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'STAFF';
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('login')
  @Public()
  @UseGuards(AuthGuard('local'))
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ZodValidationPipe(LoginRequestSchema)) _body: LoginRequest,
    @Req() req: Request & { user: AuthenticatedUser },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user } = await this.authService.login(req.user);
    this._setCookies(res, accessToken, refreshToken);
    return { user };
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawRefreshToken = req.cookies?.['refresh_token'] as string | undefined;
    if (!rawRefreshToken) throw new UnauthorizedException('No refresh token');
    const { accessToken, refreshToken, user } = await this.authService.refresh(rawRefreshToken);
    this._setCookies(res, accessToken, refreshToken);
    return { user };
  }

  @Post('logout')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    // Logout must work even when the JWT is invalid/expired — the goal is to clear
    // server-side refresh tokens (best-effort) and remove the client cookies.
    const token = req.cookies?.['access_token'] as string | undefined;
    if (token) {
      try {
        const payload = this.authService.decodeAccessToken(token);
        if (payload?.sub) {
          await this.authService.logout(payload.sub);
        }
      } catch {
        // ignore: token may be malformed / expired — still clear cookies below
      }
    }
    res.cookie('access_token', '', { httpOnly: true, maxAge: 0, path: '/' });
    res.cookie('refresh_token', '', { httpOnly: true, maxAge: 0, path: '/auth/refresh' });
  }

  @Get('me')
  async me(@Req() req: Request & { user: AuthenticatedUser }) {
    // Fetch fresh user data from the DB so fields not present in the JWT
    // payload (e.g. avatarUrl) reflect the current row without forcing a
    // re-login on every change.
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, role: true, avatarUrl: true },
    });
    if (!user) {
      // JWT references a deleted user — treat as unauthenticated.
      throw new UnauthorizedException('User no longer exists');
    }
    return user;
  }

  private _setCookies(res: Response, accessToken: string, refreshToken: string): void {
    const isProd = env().NODE_ENV === 'production';
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
      path: '/',
    });
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/auth/refresh',
    });
  }
}
