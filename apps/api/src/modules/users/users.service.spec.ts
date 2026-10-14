import { ConflictException } from '@nestjs/common';
import { verify } from 'argon2';

import type { Role } from '../../shared';

import type { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from './users.service';

const ACTOR_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const OTHER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

interface UserMock {
  findUnique: jest.Mock;
  findFirst: jest.Mock;
  count: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
}

interface PrismaMock {
  user: UserMock;
  incomingGoods: { count: jest.Mock };
}

function createUser(
  overrides: Partial<{
    id: string;
    username: string;
    name: string;
    email: string;
    role: Role;
    isLocked: boolean;
  }> = {},
) {
  return {
    id: overrides.id ?? OTHER_ID,
    username: overrides.username ?? 'operatorx',
    name: overrides.name ?? 'Operator X',
    email: overrides.email ?? 'operatorx@jmc-indonesia.test',
    role: overrides.role ?? ('OPERATOR' as Role),
    isLocked: overrides.isLocked ?? false,
  };
}

async function catchError(promise: Promise<unknown>): Promise<ConflictException> {
  try {
    await promise;
  } catch (error) {
    return error as ConflictException;
  }
  throw new Error('Expected promise to reject');
}

describe('UsersService business rules', () => {
  let prisma: PrismaMock;
  let service: UsersService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      incomingGoods: { count: jest.fn() },
    };
    service = new UsersService(prisma as unknown as PrismaService);
  });

  describe('lock (BR-05)', () => {
    it('rejects locking own account', async () => {
      const error = await catchError(service.lock(ACTOR_ID, { locked: true }, ACTOR_ID));

      expect(error.getResponse()).toMatchObject({ code: 'SELF_ACTION_FORBIDDEN' });
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects locking the last other active admin', async () => {
      prisma.user.findUnique.mockResolvedValue(createUser({ role: 'ADMIN' }));
      prisma.user.count.mockResolvedValue(0);

      const error = await catchError(
        service.lock(OTHER_ID, { locked: true }, ACTOR_ID),
      );

      expect(error.getResponse()).toMatchObject({ code: 'LAST_ADMIN' });
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('allows locking an operator', async () => {
      prisma.user.findUnique.mockResolvedValue(createUser());
      prisma.user.update.mockResolvedValue({ id: OTHER_ID, isLocked: true });

      const result = await service.lock(OTHER_ID, { locked: true }, ACTOR_ID);

      expect(result).toEqual({ id: OTHER_ID, isLocked: true });
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: OTHER_ID },
          data: { isLocked: true, lockedAt: expect.any(Date) },
        }),
      );
    });

    it('allows unlocking an admin', async () => {
      prisma.user.findUnique.mockResolvedValue(
        createUser({ role: 'ADMIN', isLocked: true }),
      );
      prisma.user.update.mockResolvedValue({ id: OTHER_ID, isLocked: false });

      const result = await service.lock(OTHER_ID, { locked: false }, ACTOR_ID);

      expect(result.isLocked).toBe(false);
    });
  });

  describe('remove (BR-05, BR-09)', () => {
    it('rejects deleting own account', async () => {
      const error = await catchError(service.remove(ACTOR_ID, ACTOR_ID));

      expect(error.getResponse()).toMatchObject({ code: 'SELF_ACTION_FORBIDDEN' });
    });

    it('rejects deleting the last other active admin', async () => {
      prisma.user.findUnique.mockResolvedValue(createUser({ role: 'ADMIN' }));
      prisma.user.count.mockResolvedValue(0);

      const error = await catchError(service.remove(OTHER_ID, ACTOR_ID));

      expect(error.getResponse()).toMatchObject({ code: 'LAST_ADMIN' });
    });

    it('rejects deleting a user who has transactions (BR-09)', async () => {
      prisma.user.findUnique.mockResolvedValue(createUser());
      prisma.user.count.mockResolvedValue(2);
      prisma.incomingGoods.count.mockResolvedValue(3);

      const error = await catchError(service.remove(OTHER_ID, ACTOR_ID));

      expect(error.getResponse()).toMatchObject({ code: 'CONFLICT_IN_USE' });
      expect(prisma.user.delete).not.toHaveBeenCalled();
    });

    it('deletes an unused operator', async () => {
      prisma.user.findUnique.mockResolvedValue(createUser());
      prisma.incomingGoods.count.mockResolvedValue(0);
      prisma.user.delete.mockResolvedValue({});

      await service.remove(OTHER_ID, ACTOR_ID);

      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: OTHER_ID } });
    });
  });

  describe('update (BR-05)', () => {
    const updateInput = {
      username: 'administrator',
      name: 'Administrator JMC',
      email: 'admin@jmc-indonesia.test',
      role: 'OPERATOR' as Role,
    };

    it('rejects demoting the last active admin', async () => {
      prisma.user.findUnique.mockResolvedValue(createUser({ role: 'ADMIN' }));
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.count.mockResolvedValue(0);

      const error = await catchError(service.update(OTHER_ID, updateInput));

      expect(error.getResponse()).toMatchObject({ code: 'LAST_ADMIN' });
    });

    it('rejects duplicate username', async () => {
      prisma.user.findUnique.mockResolvedValue(createUser());
      prisma.user.findFirst.mockResolvedValue({ id: 'cccccccc-cccc-cccc-cccc-cccccccccccc' });

      const error = await catchError(service.update(OTHER_ID, updateInput));

      expect(error.getResponse()).toMatchObject({
        code: 'CONFLICT_DUPLICATE',
        details: [{ field: 'username' }],
      });
    });

    it('updates without touching password when omitted (AS-10)', async () => {
      prisma.user.findUnique.mockResolvedValue(createUser());
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.count.mockResolvedValue(5);
      prisma.user.update.mockResolvedValue(createUser({ name: updateInput.name }));

      await service.update(OTHER_ID, { ...updateInput, role: 'OPERATOR' });

      const updateCall = prisma.user.update.mock.calls[0][0];
      expect(updateCall.data.passwordHash).toBeUndefined();
    });
  });

  describe('create (BR-03, BR-04)', () => {
    const createInput = {
      username: 'operator4',
      password: 'Operator12345',
      name: 'Siti Rahmawati',
      email: 'siti.rahma@jmc-indonesia.test',
      role: 'OPERATOR' as Role,
    };

    it('rejects duplicate email', async () => {
      prisma.user.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'cccccccc-cccc-cccc-cccc-cccccccccccc' });

      const error = await catchError(service.create(createInput));

      expect(error.getResponse()).toMatchObject({
        code: 'CONFLICT_DUPLICATE',
        details: [{ field: 'email' }],
      });
    });

    it('hashes password with argon2 before insert', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(createUser({ username: 'operator4' }));

      await service.create(createInput);

      const created = prisma.user.create.mock.calls[0][0];
      expect(created.data.passwordHash).not.toBe(createInput.password);
      await expect(
        verify(created.data.passwordHash as string, createInput.password),
      ).resolves.toBe(true);
    });
  });
});
