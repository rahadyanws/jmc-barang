import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from 'argon2';

import type { SessionUser } from '@jmc/shared';

import { PrismaService } from '../../prisma/prisma.service';
import type { LoginDto } from './dto/login.dto';

const SESSION_USER_SELECT = {
  id: true,
  username: true,
  name: true,
  email: true,
  role: true,
} as const;

let dummyHashPromise: Promise<string> | null = null;

function getDummyHash(): Promise<string> {
  dummyHashPromise ??= hash('timing-equalization-dummy-password');
  return dummyHashPromise;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<{ token: string; user: SessionUser }> {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
      select: { ...SESSION_USER_SELECT, passwordHash: true, isLocked: true },
    });

    // API_SPEC §4: user ada? → password cocok? → baru cek isLocked (anti-enumerasi)
    if (user == null) {
      await verify(await getDummyHash(), dto.password);
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Username atau password salah',
      });
    }

    const passwordValid = await verify(user.passwordHash, dto.password);
    if (!passwordValid) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Username atau password salah',
      });
    }

    if (user.isLocked) {
      throw new ForbiddenException({
        code: 'ACCOUNT_LOCKED',
        message: 'Akun Anda dikunci. Hubungi administrator.',
      });
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = await this.jwtService.signAsync({
      sub: user.id,
      role: user.role,
    });

    const { passwordHash: _passwordHash, isLocked: _isLocked, ...session } = user;
    return { token, user: session };
  }
}
