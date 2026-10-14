import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';

import type { SessionUser } from '../../shared';

import { env } from '../../config/env';
import { PrismaService } from '../../prisma/prisma.service';

interface JwtPayload {
  sub: string;
}

const SESSION_USER_SELECT = {
  id: true,
  username: true,
  name: true,
  email: true,
  role: true,
  isLocked: true,
} as const;

function fromCookie(req: Request): string | null {
  const cookies = req.cookies as Record<string, unknown> | undefined;
  const value = cookies?.[env.COOKIE_NAME];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        fromCookie,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: env.JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload): Promise<SessionUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: SESSION_USER_SELECT,
    });

    // BR-02: cek DB tiap request — lock berlaku seketika
    if (user == null) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Sesi Anda tidak valid atau telah berakhir',
      });
    }
    if (user.isLocked) {
      throw new ForbiddenException({
        code: 'ACCOUNT_LOCKED',
        message: 'Akun Anda dikunci. Hubungi administrator.',
      });
    }

    const { isLocked: _isLocked, ...session } = user;
    return session;
  }
}
