import { ForbiddenException, HttpException, UnauthorizedException } from '@nestjs/common';

import type { PrismaService } from '../../prisma/prisma.service';
import { JwtStrategy } from './jwt.strategy';

interface PrismaUserMock {
  findUnique: jest.Mock;
}

interface PrismaMock {
  user: PrismaUserMock;
}

const SESSION_PAYLOAD = {
  id: '11111111-1111-1111-1111-111111111111',
  username: 'operator1',
  name: 'Budi Santoso',
  email: 'budi.santoso@jmc-indonesia.test',
  role: 'OPERATOR',
  isLocked: false,
};

async function catchError(promise: Promise<unknown>): Promise<HttpException> {
  try {
    await promise;
  } catch (error) {
    return error as HttpException;
  }
  throw new Error('Expected promise to reject');
}

describe('JwtStrategy', () => {
  let prisma: PrismaMock;
  let strategy: JwtStrategy;

  beforeEach(() => {
    prisma = { user: { findUnique: jest.fn() } };
    strategy = new JwtStrategy(prisma as unknown as PrismaService);
  });

  it('returns session user without lock flag on valid token', async () => {
    prisma.user.findUnique.mockResolvedValue(SESSION_PAYLOAD);

    const user = await strategy.validate({ sub: SESSION_PAYLOAD.id });

    expect(user).toEqual({
      id: SESSION_PAYLOAD.id,
      username: SESSION_PAYLOAD.username,
      name: SESSION_PAYLOAD.name,
      email: SESSION_PAYLOAD.email,
      role: 'OPERATOR',
    });
    expect(user).not.toHaveProperty('isLocked');
  });

  it('throws UNAUTHORIZED when user no longer exists', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(strategy.validate({ sub: SESSION_PAYLOAD.id })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('throws ACCOUNT_LOCKED when user is locked (BR-02, seketika)', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...SESSION_PAYLOAD, isLocked: true });

    const error = await catchError(strategy.validate({ sub: SESSION_PAYLOAD.id }));

    expect(error).toBeInstanceOf(ForbiddenException);
    expect(error.getResponse()).toMatchObject({ code: 'ACCOUNT_LOCKED' });
  });
});
