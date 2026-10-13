import { ForbiddenException, HttpException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash } from 'argon2';

import type { SessionUser } from '@jmc/shared';

import type { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';
import type { LoginDto } from './dto/login.dto';

const SESSION_USER: SessionUser = {
  id: '11111111-1111-1111-1111-111111111111',
  username: 'administrator',
  name: 'Administrator JMC',
  email: 'admin@jmc-indonesia.test',
  role: 'ADMIN',
};

const PASSWORD = 'Admin12345';

interface PrismaUserMock {
  findUnique: jest.Mock;
  update: jest.Mock;
}

interface PrismaMock {
  user: PrismaUserMock;
}

interface JwtMock {
  signAsync: jest.Mock;
}

function createPrismaMock(): PrismaMock {
  return {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
}

function createJwtMock(): JwtMock {
  return {
    signAsync: jest.fn().mockResolvedValue('signed-token'),
  };
}

async function catchError(promise: Promise<unknown>): Promise<HttpException> {
  try {
    await promise;
  } catch (error) {
    return error as HttpException;
  }
  throw new Error('Expected promise to reject');
}

describe('AuthService', () => {
  let prisma: PrismaMock;
  let jwtService: JwtMock;
  let authService: AuthService;
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await hash(PASSWORD);
  });

  beforeEach(() => {
    prisma = createPrismaMock();
    jwtService = createJwtMock();
    authService = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
    );
  });

  describe('login', () => {
    it('returns session user and signs token on valid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...SESSION_USER,
        passwordHash,
        isLocked: false,
      });
      prisma.user.update.mockResolvedValue({});

      const result = await authService.login({
        username: SESSION_USER.username,
        password: PASSWORD,
      } as LoginDto);

      expect(result.user).toEqual(SESSION_USER);
      expect(result.token).toBe('signed-token');
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: SESSION_USER.id,
        role: SESSION_USER.role,
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: SESSION_USER.id },
        data: { lastLoginAt: expect.any(Date) },
      });
    });

    it('throws INVALID_CREDENTIALS for unknown username', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const error = await catchError(
        authService.login({ username: 'ghost-user', password: PASSWORD } as LoginDto),
      );

      expect(error).toBeInstanceOf(UnauthorizedException);
      expect(error.getResponse()).toMatchObject({ code: 'INVALID_CREDENTIALS' });
    });

    it('throws INVALID_CREDENTIALS for wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...SESSION_USER,
        passwordHash,
        isLocked: false,
      });

      const error = await catchError(
        authService.login({
          username: SESSION_USER.username,
          password: 'WrongPassword1',
        } as LoginDto),
      );

      expect(error).toBeInstanceOf(UnauthorizedException);
      expect(error.getResponse()).toMatchObject({ code: 'INVALID_CREDENTIALS' });
    });

    it('throws ACCOUNT_LOCKED after correct password for locked user (BR-02)', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...SESSION_USER,
        username: 'operator3',
        passwordHash,
        isLocked: true,
      });

      const error = await catchError(
        authService.login({ username: 'operator3', password: PASSWORD } as LoginDto),
      );

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(error.getResponse()).toMatchObject({ code: 'ACCOUNT_LOCKED' });
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('does not leak lock status for wrong password on locked user', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...SESSION_USER,
        username: 'operator3',
        passwordHash,
        isLocked: true,
      });

      const error = await catchError(
        authService.login({
          username: 'operator3',
          password: 'WrongPassword1',
        } as LoginDto),
      );

      expect(error).toBeInstanceOf(UnauthorizedException);
      expect(error.getResponse()).toMatchObject({ code: 'INVALID_CREDENTIALS' });
    });
  });
});
