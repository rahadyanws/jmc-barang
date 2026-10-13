import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { hash } from 'argon2';
import { Prisma } from '@prisma/client';

import type {
  CreateUserInput,
  LockUserInput,
  Role,
  UpdateUserInput,
  UserListQuery,
} from '@jmc/shared';

import { buildMeta } from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';

const USER_SELECT = {
  id: true,
  username: true,
  name: true,
  email: true,
  role: true,
  isLocked: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: UserListQuery) {
    const { page, pageSize, search, role, sortBy, sortOrder } = query;

    const searchFilters: Prisma.UserWhereInput[] =
      search !== undefined && search.length > 0
        ? [
            {
              OR: [
                { username: { contains: search, mode: 'insensitive' } },
                { name: { contains: search, mode: 'insensitive' } },
              ],
            },
          ]
        : [];

    const where: Prisma.UserWhereInput = {
      AND: [...(role !== undefined ? [{ role }] : []), ...searchFilters],
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: [{ [sortBy]: sortOrder } as Prisma.UserOrderByWithRelationInput, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: USER_SELECT,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data: items, meta: buildMeta(page, pageSize, totalItems) };
  }

  async options(role?: Role) {
    return this.prisma.user.findMany({
      where: {
        isLocked: false,
        ...(role !== undefined ? { role } : {}),
      },
      select: { id: true, name: true, username: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }

  async getById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });
    if (user === null) {
      throw this.notFound();
    }
    return user;
  }

  async create(input: CreateUserInput) {
    await this.assertUsernameAvailable(input.username);
    await this.assertEmailAvailable(input.email);

    const passwordHash = await hash(input.password);

    try {
      return await this.prisma.user.create({
        data: {
          username: input.username,
          passwordHash,
          name: input.name,
          email: input.email,
          role: input.role,
        },
        select: USER_SELECT,
      });
    } catch (error) {
      this.rethrowDuplicate(error);
    }
  }

  async update(id: string, input: UpdateUserInput) {
    const target = await this.getById(id);

    await this.assertUsernameAvailable(input.username, id);
    await this.assertEmailAvailable(input.email, id);
    await this.assertActiveAdminRemains(target.role, input.role, id);

    const passwordHash =
      input.password !== undefined && input.password.length > 0
        ? await hash(input.password)
        : undefined;

    try {
      return await this.prisma.user.update({
        where: { id },
        data: {
          username: input.username,
          name: input.name,
          email: input.email,
          role: input.role,
          ...(passwordHash !== undefined ? { passwordHash } : {}),
        },
        select: USER_SELECT,
      });
    } catch (error) {
      this.rethrowDuplicate(error);
    }
  }

  async lock(id: string, input: LockUserInput, actorId: string) {
    // BR-05: admin tidak boleh mengunci dirinya sendiri
    if (id === actorId) {
      throw new ConflictException({
        code: 'SELF_ACTION_FORBIDDEN',
        message: 'Anda tidak dapat mengunci akun sendiri',
      });
    }

    const target = await this.getById(id);

    if (input.locked && target.role === 'ADMIN' && !target.isLocked) {
      await this.assertAnotherActiveAdminExists(target.id);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isLocked: input.locked, lockedAt: input.locked ? new Date() : null },
      select: { id: true, isLocked: true },
    });

    return updated;
  }

  async remove(id: string, actorId: string) {
    // BR-05: admin tidak boleh menghapus dirinya sendiri
    if (id === actorId) {
      throw new ConflictException({
        code: 'SELF_ACTION_FORBIDDEN',
        message: 'Anda tidak dapat menghapus akun sendiri',
      });
    }

    const target = await this.getById(id);

    if (target.role === 'ADMIN' && !target.isLocked) {
      await this.assertAnotherActiveAdminExists(target.id);
    }

    // BR-09: user dengan transaksi tidak dapat dihapus
    const transactionCount = await this.prisma.incomingGoods.count({
      where: { OR: [{ operatorId: id }, { createdById: id }] },
    });
    if (transactionCount > 0) {
      throw new ConflictException({
        code: 'CONFLICT_IN_USE',
        message:
          'User tidak dapat dihapus karena memiliki data barang masuk. Gunakan kunci (lock) sebagai gantinya.',
      });
    }

    try {
      await this.prisma.user.delete({ where: { id } });
    } catch (error) {
      this.rethrowNotFound(error);
    }
  }

  private async assertActiveAdminRemains(
    currentRole: Role,
    nextRole: Role,
    targetId: string,
  ): Promise<void> {
    if (currentRole !== 'ADMIN' || nextRole === 'ADMIN') {
      return;
    }
    await this.assertAnotherActiveAdminExists(targetId);
  }

  private async assertAnotherActiveAdminExists(excludeUserId: string): Promise<void> {
    const remainingAdmins = await this.prisma.user.count({
      where: { role: 'ADMIN', isLocked: false, NOT: { id: excludeUserId } },
    });
    if (remainingAdmins === 0) {
      throw new ConflictException({
        code: 'LAST_ADMIN',
        message: 'Harus selalu ada minimal satu Admin aktif',
      });
    }
  }

  private async assertUsernameAvailable(username: string, excludeId?: string): Promise<void> {
    const clash = await this.prisma.user.findFirst({
      where: excludeId === undefined ? { username } : { username, NOT: { id: excludeId } },
      select: { id: true },
    });
    if (clash !== null) {
      throw this.duplicate('username', 'Username sudah digunakan');
    }
  }

  private async assertEmailAvailable(email: string, excludeId?: string): Promise<void> {
    const clash = await this.prisma.user.findFirst({
      where: excludeId === undefined ? { email } : { email, NOT: { id: excludeId } },
      select: { id: true },
    });
    if (clash !== null) {
      throw this.duplicate('email', 'Email sudah digunakan');
    }
  }

  private duplicate(field: string, message: string): ConflictException {
    return new ConflictException({
      code: 'CONFLICT_DUPLICATE',
      message,
      details: [{ field, message }],
    });
  }

  private notFound(): NotFoundException {
    return new NotFoundException({
      code: 'NOT_FOUND',
      message: 'User tidak ditemukan',
    });
  }

  private rethrowDuplicate(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw this.duplicate('username', 'Username atau email sudah digunakan');
    }
    throw error;
  }

  private rethrowNotFound(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw this.notFound();
    }
    throw error;
  }
}
