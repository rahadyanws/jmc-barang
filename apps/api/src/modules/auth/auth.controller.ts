import { Body, Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';

import type { SessionUser } from '../../shared';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { SESSION_COOKIE_OPTIONS, parseExpiresInMs } from '../../common/utils/cookie.util';
import { env } from '../../config/env';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

function loginTracker(req: Record<string, unknown>): string {
  const body = req['body'] as { username?: unknown } | undefined;
  const username = typeof body?.username === 'string' ? body.username : '';
  const ip = typeof req['ip'] === 'string' ? req['ip'] : 'unknown';
  return `${ip}:${username}`;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000, getTracker: loginTracker } })
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: SessionUser }> {
    const { token, user } = await this.authService.login(dto);
    res.cookie(env.COOKIE_NAME, token, {
      ...SESSION_COOKIE_OPTIONS,
      maxAge: parseExpiresInMs(env.JWT_EXPIRES_IN),
    });
    return { user };
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(env.COOKIE_NAME, SESSION_COOKIE_OPTIONS);
  }

  @Get('me')
  me(@CurrentUser() user: SessionUser): { user: SessionUser } {
    return { user };
  }
}
