import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type {
  CreateSubCategoryInput,
  SubCategoryListQuery,
  UpdateSubCategoryInput,
} from '@jmc/shared';

import { buildMeta } from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';

const SUB_CATEGORY_SELECT = {
  id: true,
  name: true,
  priceLimit: true,
  category: { select: { id: true, code: true, name: true } },
} as const;

@Injectable()
export class SubCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: SubCategoryListQuery) {
    const { page, pageSize, search, categoryId, sortBy, sortOrder } = query;

    const searchFilters: Prisma.SubCategoryWhereInput[] =
      search !== undefined && search.length > 0
        ? [
            {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { category: { name: { contains: search, mode: 'insensitive' } } },
              ],
            },
          ]
        : [];

    const where: Prisma.SubCategoryWhereInput = {
      AND: [...(categoryId !== undefined ? [{ categoryId }] : []), ...searchFilters],
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.subCategory.findMany({
        where,
        orderBy: [
          { [sortBy]: sortOrder } as Prisma.SubCategoryOrderByWithRelationInput,
          { id: 'asc' },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: SUB_CATEGORY_SELECT,
      }),
      this.prisma.subCategory.count({ where }),
    ]);

    const data = items.map((item) => ({
      ...item,
      priceLimit: Number(item.priceLimit),
    }));

    return { data, meta: buildMeta(page, pageSize, totalItems) };
  }

  async options(categoryId?: string) {
    const items = await this.prisma.subCategory.findMany({
      where: categoryId !== undefined ? { categoryId } : undefined,
      select: { id: true, name: true, priceLimit: true, categoryId: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });

    return items.map((item) => ({
      ...item,
      priceLimit: Number(item.priceLimit),
    }));
  }

  async getById(id: string) {
    const subCategory = await this.prisma.subCategory.findUnique({
      where: { id },
      select: SUB_CATEGORY_SELECT,
    });
    if (subCategory === null) {
      throw this.notFound();
    }
    return { ...subCategory, priceLimit: Number(subCategory.priceLimit) };
  }

  async create(input: CreateSubCategoryInput) {
    await this.assertCategoryExists(input.categoryId);
    await this.assertNameAvailable(input.categoryId, input.name);

    try {
      const created = await this.prisma.subCategory.create({
        data: {
          categoryId: input.categoryId,
          name: input.name,
          priceLimit: input.priceLimit,
        },
        select: SUB_CATEGORY_SELECT,
      });
      return { ...created, priceLimit: Number(created.priceLimit) };
    } catch (error) {
      this.rethrowDuplicate(error);
    }
  }

  async update(id: string, input: UpdateSubCategoryInput) {
    await this.getById(id);
    await this.assertCategoryExists(input.categoryId);
    await this.assertNameAvailable(input.categoryId, input.name, id);

    try {
      const updated = await this.prisma.subCategory.update({
        where: { id },
        data: {
          categoryId: input.categoryId,
          name: input.name,
          priceLimit: input.priceLimit,
        },
        select: SUB_CATEGORY_SELECT,
      });
      return { ...updated, priceLimit: Number(updated.priceLimit) };
    } catch (error) {
      this.rethrowDuplicate(error);
    }
  }

  async remove(id: string) {
    await this.getById(id);

    // BR-08: sub kategori yang dipakai barang masuk tidak dapat dihapus
    const usageCount = await this.prisma.incomingGoods.count({
      where: { subCategoryId: id },
    });
    if (usageCount > 0) {
      throw new ConflictException({
        code: 'CONFLICT_IN_USE',
        message: 'Sub kategori tidak dapat dihapus karena masih dipakai barang masuk',
      });
    }

    try {
      await this.prisma.subCategory.delete({ where: { id } });
    } catch (error) {
      this.rethrowNotFound(error);
    }
  }

  private async assertCategoryExists(categoryId: string): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });
    if (category === null) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Kategori tidak ditemukan',
      });
    }
  }

  private async assertNameAvailable(
    categoryId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const clash = await this.prisma.subCategory.findFirst({
      where: {
        categoryId,
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId !== undefined ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (clash !== null) {
      throw this.duplicateName();
    }
  }

  private duplicateName(): ConflictException {
    return new ConflictException({
      code: 'CONFLICT_DUPLICATE',
      message: 'Nama sub kategori sudah digunakan pada kategori ini',
      details: [{ field: 'name', message: 'Nama sudah digunakan' }],
    });
  }

  private notFound(): NotFoundException {
    return new NotFoundException({
      code: 'NOT_FOUND',
      message: 'Sub kategori tidak ditemukan',
    });
  }

  private rethrowDuplicate(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw this.duplicateName();
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
