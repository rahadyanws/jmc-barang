import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { CategoryListQuery, CreateCategoryInput, UpdateCategoryInput } from '../../shared';

import { buildMeta } from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';

const CATEGORY_SELECT = { id: true, code: true, name: true } as const;

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: CategoryListQuery) {
    const { page, pageSize, search, sortBy, sortOrder } = query;

    const where: Prisma.CategoryWhereInput | undefined =
      search !== undefined && search.length > 0
        ? {
            OR: [
              { code: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined;

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        where,
        orderBy: [{ [sortBy]: sortOrder } as Prisma.CategoryOrderByWithRelationInput, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: CATEGORY_SELECT,
      }),
      this.prisma.category.count({ where }),
    ]);

    return { data: items, meta: buildMeta(page, pageSize, totalItems) };
  }

  async options() {
    return this.prisma.category.findMany({
      select: CATEGORY_SELECT,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }

  async getById(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: CATEGORY_SELECT,
    });
    if (category === null) {
      throw this.notFound();
    }
    return category;
  }

  async create(input: CreateCategoryInput) {
    await this.assertCodeAvailable(input.code);

    try {
      return await this.prisma.category.create({
        data: { code: input.code, name: input.name },
        select: CATEGORY_SELECT,
      });
    } catch (error) {
      this.rethrowDuplicate(error);
    }
  }

  async update(id: string, input: UpdateCategoryInput) {
    await this.getById(id);
    await this.assertCodeAvailable(input.code, id);

    try {
      return await this.prisma.category.update({
        where: { id },
        data: { code: input.code, name: input.name },
        select: CATEGORY_SELECT,
      });
    } catch (error) {
      this.rethrowDuplicate(error);
    }
  }

  async remove(id: string) {
    await this.getById(id);

    // BR-07: kategori dengan sub kategori tidak dapat dihapus
    const subCategoryCount = await this.prisma.subCategory.count({
      where: { categoryId: id },
    });
    if (subCategoryCount > 0) {
      throw new ConflictException({
        code: 'CONFLICT_IN_USE',
        message: 'Kategori tidak dapat dihapus karena masih memiliki sub kategori',
      });
    }

    try {
      await this.prisma.category.delete({ where: { id } });
    } catch (error) {
      this.rethrowNotFound(error);
    }
  }

  private async assertCodeAvailable(code: string, excludeId?: string): Promise<void> {
    const clash = await this.prisma.category.findFirst({
      where: excludeId === undefined ? { code } : { code, NOT: { id: excludeId } },
      select: { id: true },
    });
    if (clash !== null) {
      throw this.duplicateCode();
    }
  }

  private duplicateCode(): ConflictException {
    return new ConflictException({
      code: 'CONFLICT_DUPLICATE',
      message: 'Kode sudah digunakan',
      details: [{ field: 'code', message: 'Kode sudah digunakan' }],
    });
  }

  private notFound(): NotFoundException {
    return new NotFoundException({
      code: 'NOT_FOUND',
      message: 'Kategori tidak ditemukan',
    });
  }

  private rethrowDuplicate(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw this.duplicateCode();
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
