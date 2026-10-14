import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import {
  MAX_EXPORT_ROWS,
  calcGrandTotal,
  calcLineTotal,
  type CategoryDto,
  type CreateIncomingGoodsInput,
  type IncomingGoodsDetailDto,
  type IncomingGoodsExportQuery,
  type IncomingGoodsItemDto,
  type IncomingGoodsListQuery,
  type PaginationMeta,
  type SessionUser,
  type UpdateIncomingGoodsInput,
} from '../../shared';

import { buildMeta } from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService, type IncomingAttachmentFile } from '../storage/storage.service';
import {
  buildIncomingGoodsOrderBy,
  buildIncomingGoodsWhere,
  wibYear,
} from './incoming-goods.query';
import { scopeByUser } from './scope.util';

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

interface LoadedIncomingGoods {
  id: string;
  transactionDate: Date;
  origin: string;
  letterNumber: string | null;
  unit: string;
  totalAmount: unknown;
  isVerified: boolean;
  attachmentName: string | null;
  attachmentSize: number | null;
  attachmentKey: string | null;
  operator: { id: string; name: string };
  subCategory: {
    id: string;
    name: string;
    priceLimit: unknown;
    category: CategoryDto;
  };
  items: Array<{
    id: string;
    lineNo: number;
    itemCode: string;
    name: string;
    unitPrice: unknown;
    quantity: number;
    uom: string;
    lineTotal: unknown;
    expiredDate: Date | null;
  }>;
}

function wibDayString(date: Date): string {
  return new Date(date.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

@Injectable()
export class IncomingGoodsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async create(
    input: CreateIncomingGoodsInput,
    actor: SessionUser,
  ): Promise<IncomingGoodsDetailDto> {
    const operatorId = await this.resolveOperatorId(input.operatorId, actor);
    const subCategory = await this.loadSubCategory(input.subCategoryId);

    const total = calcGrandTotal(input.items);
    const priceLimit = Number(subCategory.priceLimit);
    if (total > priceLimit) {
      throw this.priceLimitExceeded(priceLimit, total);
    }

    // AS-04: tanggal = waktu server; BR-16: tidak dapat diedit
    const transactionDate = new Date();
    this.assertExpiredDates(
      input.items.map((item) => item.expiredDate),
      transactionDate,
    );

    const id = await this.prisma.$transaction(async (tx) => {
      const itemCodes = await this.allocateItemCodes(
        tx,
        subCategory.category.id,
        subCategory.category.code,
        input.items.length,
      );

      const header = await tx.incomingGoods.create({
        data: {
          transactionDate,
          operatorId,
          subCategoryId: input.subCategoryId,
          origin: input.origin,
          letterNumber:
            input.letterNumber != null && input.letterNumber !== ''
              ? input.letterNumber
              : null,
          priceLimitSnapshot: priceLimit,
          totalAmount: total,
          createdById: actor.id,
          items: {
            create: input.items.map((item, index) => ({
              lineNo: index + 1,
              itemCode: itemCodes[index] as string,
              name: item.name,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              uom: item.uom,
              lineTotal: calcLineTotal(item.unitPrice, item.quantity),
              expiredDate:
                item.expiredDate != null ? parseDateOnly(item.expiredDate) : null,
            })),
          },
        },
        select: { id: true },
      });
      return header.id;
    });

    return this.getById(id, actor);
  }

  async list(
    query: IncomingGoodsListQuery,
    actor: SessionUser,
  ): Promise<{ data: IncomingGoodsDetailDto[]; meta: PaginationMeta }> {
    const { page, pageSize } = query;
    const where = buildIncomingGoodsWhere(query, scopeByUser(actor));
    const orderBy = buildIncomingGoodsOrderBy(query.sortBy, query.sortOrder);

    const [headers, totalItems] = await this.prisma.$transaction([
      this.prisma.incomingGoods.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          operator: { select: { id: true, name: true } },
          subCategory: {
            include: { category: { select: { id: true, code: true, name: true } } },
          },
          items: { orderBy: { lineNo: 'asc' } },
        },
      }),
      this.prisma.incomingGoods.count({ where }),
    ]);

    return {
      data: headers.map((header) => this.toDetail(header)),
      meta: buildMeta(page, pageSize, totalItems),
    };
  }

  /** Tahun tersedia (WIB) untuk filter dropdown — hanya yang punya data. */
  async getYears(actor: SessionUser): Promise<number[]> {
    const rows = await this.prisma.incomingGoods.findMany({
      where: scopeByUser(actor),
      select: { transactionDate: true },
    });
    const years = new Set(rows.map((row) => wibYear(row.transactionDate)));
    return [...years].sort((a, b) => b - a);
  }

  /** AC-09 / BR-17: Admin menyetel status verifikasi; un-verify mengembalikan kemampuan edit. */
  async setVerification(
    id: string,
    verified: boolean,
    actor: SessionUser,
  ): Promise<{ id: string; isVerified: boolean; verifiedAt: string | null }> {
    const existing = await this.prisma.incomingGoods.findFirst({
      where: { id, ...scopeByUser(actor) },
      select: { id: true },
    });
    if (existing == null) {
      throw this.notFound();
    }

    const updated = await this.prisma.incomingGoods.update({
      where: { id },
      data: verified
        ? { isVerified: true, verifiedAt: new Date(), verifiedById: actor.id }
        : { isVerified: false, verifiedAt: null, verifiedById: null },
      select: { id: true, isVerified: true, verifiedAt: true },
    });

    return {
      id: updated.id,
      isVerified: updated.isVerified,
      verifiedAt: updated.verifiedAt?.toISOString() ?? null,
    };
  }

  /** BR-20: rows export tanpa paging — where/orderBy identik dengan list. */
  async exportRows(
    query: IncomingGoodsExportQuery,
    actor: SessionUser,
  ): Promise<{ data: IncomingGoodsDetailDto[] }> {
    const where = buildIncomingGoodsWhere(query, scopeByUser(actor));
    const orderBy = buildIncomingGoodsOrderBy(query.sortBy, query.sortOrder);

    const totalItems = await this.prisma.incomingGoods.count({ where });
    if (totalItems > MAX_EXPORT_ROWS) {
      throw new UnprocessableEntityException({
        code: 'EXPORT_TOO_LARGE',
        message: `Data melebihi batas ${MAX_EXPORT_ROWS} baris. Silakan persempit filter.`,
      });
    }

    const headers = await this.prisma.incomingGoods.findMany({
      where,
      orderBy,
      include: {
        operator: { select: { id: true, name: true } },
        subCategory: {
          include: { category: { select: { id: true, code: true, name: true } } },
        },
        items: { orderBy: { lineNo: 'asc' } },
      },
    });

    return { data: headers.map((header) => this.toDetail(header)) };
  }

  /** BR-19 / AS-12: upload lampiran; ganti lampiran lama (best-effort delete). */
  async uploadAttachment(
    id: string,
    file: IncomingAttachmentFile,
    actor: SessionUser,
  ): Promise<{ fileName: string; size: number }> {
    const existing = await this.loadForAttachment(id, actor);
    const validated = this.storage.validateAttachment(file);
    const key = this.storage.buildKey(id, validated.ext);

    await this.storage.upload(key, file.buffer, validated.mime);
    if (existing.attachmentKey != null && existing.attachmentKey !== key) {
      await this.storage.delete(existing.attachmentKey);
    }

    await this.prisma.incomingGoods.update({
      where: { id },
      data: {
        attachmentKey: key,
        attachmentName: validated.fileName,
        attachmentSize: validated.size,
        attachmentMime: validated.mime,
      },
      select: { id: true },
    });

    return { fileName: validated.fileName, size: validated.size };
  }

  async getAttachment(
    id: string,
    actor: SessionUser,
  ): Promise<{ url: string; fileName: string; expiresInSeconds: number }> {
    const existing = await this.loadForAttachment(id, actor, false);
    if (existing.attachmentKey == null || existing.attachmentName == null) {
      throw new NotFoundException({
        code: 'ATTACHMENT_NOT_FOUND',
        message: 'Lampiran tidak ditemukan',
      });
    }
    const expiresInSeconds = 60;
    const url =
      this.storage.driver === 'local'
        ? `/incoming-goods/${id}/attachment/content`
        : await this.storage.createSignedUrl(existing.attachmentKey, expiresInSeconds);
    return { url, fileName: existing.attachmentName, expiresInSeconds };
  }

  /** Driver local: stream isi lampiran (dev). Supabase memakai signed URL. */
  async getAttachmentContent(
    id: string,
    actor: SessionUser,
  ): Promise<{ buffer: Buffer; mime: string; fileName: string }> {
    if (this.storage.driver !== 'local') {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Endpoint konten hanya tersedia pada driver local',
      });
    }
    const existing = await this.loadForAttachment(id, actor, false);
    if (existing.attachmentKey == null || existing.attachmentMime == null) {
      throw new NotFoundException({
        code: 'ATTACHMENT_NOT_FOUND',
        message: 'Lampiran tidak ditemukan',
      });
    }
    const buffer = await this.storage
      .readLocal(existing.attachmentKey)
      .catch(() => {
        throw new NotFoundException({
          code: 'ATTACHMENT_NOT_FOUND',
          message: 'Lampiran tidak ditemukan',
        });
      });
    return {
      buffer,
      mime: existing.attachmentMime,
      fileName: existing.attachmentName ?? 'lampiran',
    };
  }

  async removeAttachment(id: string, actor: SessionUser): Promise<void> {
    const existing = await this.loadForAttachment(id, actor);
    if (existing.attachmentKey == null) {
      return;
    }
    await this.storage.delete(existing.attachmentKey);
    await this.prisma.incomingGoods.update({
      where: { id },
      data: {
        attachmentKey: null,
        attachmentName: null,
        attachmentSize: null,
        attachmentMime: null,
      },
      select: { id: true },
    });
  }

  private async loadForAttachment(
    id: string,
    actor: SessionUser,
    lockWhenVerified = true,
  ): Promise<{
    id: string;
    isVerified: boolean;
    attachmentKey: string | null;
    attachmentName: string | null;
    attachmentMime: string | null;
  }> {
    const existing = await this.prisma.incomingGoods.findFirst({
      where: { id, ...scopeByUser(actor) },
      select: {
        id: true,
        isVerified: true,
        attachmentKey: true,
        attachmentName: true,
        attachmentMime: true,
      },
    });
    if (existing == null) {
      throw this.notFound();
    }
    if (lockWhenVerified && existing.isVerified) {
      throw this.recordVerifiedLocked();
    }
    return existing;
  }

  async getById(id: string, actor: SessionUser): Promise<IncomingGoodsDetailDto> {
    const header = await this.prisma.incomingGoods.findFirst({
      where: { id, ...scopeByUser(actor) },
      include: {
        operator: { select: { id: true, name: true } },
        subCategory: {
          include: { category: { select: { id: true, code: true, name: true } } },
        },
        items: { orderBy: { lineNo: 'asc' } },
      },
    });
    if (header == null) {
      throw this.notFound();
    }
    return this.toDetail(header);
  }

  async update(
    id: string,
    input: UpdateIncomingGoodsInput,
    actor: SessionUser,
  ): Promise<IncomingGoodsDetailDto> {
    const existing = await this.prisma.incomingGoods.findFirst({
      where: { id, ...scopeByUser(actor) },
      select: { id: true, isVerified: true, transactionDate: true },
    });
    if (existing == null) {
      throw this.notFound();
    }
    if (existing.isVerified) {
      throw this.recordVerifiedLocked();
    }

    const operatorId = await this.resolveOperatorId(input.operatorId, actor);
    const subCategory = await this.loadSubCategory(input.subCategoryId);

    const total = calcGrandTotal(input.items);
    const priceLimit = Number(subCategory.priceLimit);
    if (total > priceLimit) {
      throw this.priceLimitExceeded(priceLimit, total);
    }

    this.assertExpiredDates(
      input.items.map((item) => item.expiredDate),
      existing.transactionDate,
    );

    await this.prisma.$transaction(async (tx) => {
      // BR-15: sinkronisasi per id — update / insert / delete
      const currentItems = await tx.incomingGoodsItem.findMany({
        where: { incomingGoodsId: id },
        select: { id: true },
      });
      const currentIds = new Set(currentItems.map((item) => item.id));
      const payloadIds = input.items
        .map((item) => item.id)
        .filter((itemId): itemId is string => itemId !== undefined);

      for (const itemId of payloadIds) {
        if (!currentIds.has(itemId)) {
          throw new BadRequestException({
            code: 'VALIDATION_ERROR',
            message: 'Item tidak valid',
            details: [{ field: 'items', message: 'Item tidak ditemukan pada transaksi ini' }],
          });
        }
      }

      const deleteIds = [...currentIds].filter((itemId) => !payloadIds.includes(itemId));
      if (deleteIds.length > 0) {
        await tx.incomingGoodsItem.deleteMany({
          where: { id: { in: deleteIds }, incomingGoodsId: id },
        });
      }

      const newItems = input.items.filter((item) => item.id === undefined);
      const itemCodes =
        newItems.length > 0
          ? await this.allocateItemCodes(
              tx,
              subCategory.category.id,
              subCategory.category.code,
              newItems.length,
            )
          : [];
      let insertCursor = 0;

      for (const [index, item] of input.items.entries()) {
        const lineNo = index + 1;
        const lineTotal = calcLineTotal(item.unitPrice, item.quantity);
        const expiredDate =
          item.expiredDate != null ? parseDateOnly(item.expiredDate) : null;

        if (item.id !== undefined) {
          await tx.incomingGoodsItem.update({
            where: { id: item.id },
            data: {
              lineNo,
              name: item.name,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              uom: item.uom,
              lineTotal,
              expiredDate,
            },
          });
        } else {
          await tx.incomingGoodsItem.create({
            data: {
              incomingGoodsId: id,
              lineNo,
              itemCode: itemCodes[insertCursor] as string,
              name: item.name,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              uom: item.uom,
              lineTotal,
              expiredDate,
            },
          });
          insertCursor += 1;
        }
      }

      await tx.incomingGoods.update({
        where: { id },
        data: {
          operatorId,
          subCategoryId: input.subCategoryId,
          origin: input.origin,
          letterNumber:
            input.letterNumber != null && input.letterNumber !== ''
              ? input.letterNumber
              : null,
          priceLimitSnapshot: priceLimit,
          totalAmount: total,
        },
      });
    });

    return this.getById(id, actor);
  }

  async remove(id: string, actor: SessionUser): Promise<void> {
    const existing = await this.prisma.incomingGoods.findFirst({
      where: { id, ...scopeByUser(actor) },
      select: { id: true, isVerified: true, attachmentKey: true },
    });
    if (existing == null) {
      throw this.notFound();
    }
    if (existing.isVerified) {
      throw this.recordVerifiedLocked();
    }

    await this.prisma.incomingGoods.delete({ where: { id } });
    if (existing.attachmentKey != null) {
      await this.storage.delete(existing.attachmentKey);
    }
  }

  private async loadSubCategory(subCategoryId: string) {
    const subCategory = await this.prisma.subCategory.findUnique({
      where: { id: subCategoryId },
      include: { category: { select: { id: true, code: true, name: true } } },
    });
    if (subCategory == null) {
      throw new NotFoundException({
        code: 'SUBCATEGORY_NOT_FOUND',
        message: 'Sub kategori tidak ditemukan',
      });
    }
    return subCategory;
  }

  /** BR-10: Operator dipaksa = dirinya sendiri; Admin memilih operator aktif. */
  private async resolveOperatorId(
    requestedOperatorId: string,
    actor: SessionUser,
  ): Promise<string> {
    if (actor.role === 'OPERATOR') {
      return actor.id;
    }
    const operator = await this.prisma.user.findUnique({
      where: { id: requestedOperatorId },
      select: { id: true, role: true, isLocked: true },
    });
    if (operator == null || operator.role !== 'OPERATOR' || operator.isLocked) {
      throw new NotFoundException({
        code: 'OPERATOR_NOT_FOUND',
        message: 'Operator tidak ditemukan',
      });
    }
    return operator.id;
  }

  /** BR-21: kode barang atomik per kategori, unik global. */
  private async allocateItemCodes(
    tx: Prisma.TransactionClient,
    categoryId: string,
    categoryCode: string,
    count: number,
  ): Promise<string[]> {
    const counter = await tx.itemCodeCounter.upsert({
      where: { categoryId },
      create: { categoryId, lastValue: count },
      update: { lastValue: { increment: count } },
      select: { lastValue: true },
    });
    const end = counter.lastValue;
    return Array.from({ length: count }, (_, index) => {
      const sequence = end - count + 1 + index;
      return `${categoryCode}${String(sequence).padStart(4, '0')}`;
    });
  }

  /** BR-13: Σ lineTotal ≤ priceLimit (inklusif, AS-15). */
  private priceLimitExceeded(limit: number, total: number): UnprocessableEntityException {
    return new UnprocessableEntityException({
      code: 'PRICE_LIMIT_EXCEEDED',
      message: 'Total harga melebihi batas harga sub kategori',
      details: { limit, total, excess: total - limit },
    });
  }

  private recordVerifiedLocked(): ConflictException {
    return new ConflictException({
      code: 'RECORD_VERIFIED_LOCKED',
      message: 'Transaksi sudah terverifikasi dan tidak dapat diubah',
    });
  }

  private notFound(): NotFoundException {
    return new NotFoundException({
      code: 'NOT_FOUND',
      message: 'Barang masuk tidak ditemukan',
    });
  }

  /** AS-11: expired (hari WIB) tidak boleh sebelum tanggal transaksi (hari WIB). */
  private assertExpiredDates(expiredDates: Array<string | null | undefined>, transactionDate: Date): void {
    const minimumDay = wibDayString(transactionDate);
    for (const [index, expiredDate] of expiredDates.entries()) {
      if (expiredDate != null && expiredDate < minimumDay) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Tanggal expired tidak boleh sebelum tanggal transaksi',
          details: [
            {
              field: `items.${index}.expiredDate`,
              message: 'Tanggal expired tidak boleh sebelum tanggal transaksi',
            },
          ],
        });
      }
    }
  }

  private toDetail(header: LoadedIncomingGoods): IncomingGoodsDetailDto {
    return {
      id: header.id,
      transactionDate: header.transactionDate.toISOString(),
      origin: header.origin,
      letterNumber: header.letterNumber,
      unit: header.unit,
      operator: header.operator,
      category: header.subCategory.category,
      subCategory: {
        id: header.subCategory.id,
        name: header.subCategory.name,
        priceLimit: Number(header.subCategory.priceLimit),
      },
      totalAmount: Number(header.totalAmount),
      isVerified: header.isVerified,
      hasAttachment: header.attachmentKey != null,
      attachment:
        header.attachmentKey != null && header.attachmentName != null
          ? { fileName: header.attachmentName, size: header.attachmentSize ?? 0 }
          : null,
      items: header.items.map(
        (item): IncomingGoodsItemDto => ({
          id: item.id,
          lineNo: item.lineNo,
          itemCode: item.itemCode,
          name: item.name,
          unitPrice: Number(item.unitPrice),
          quantity: item.quantity,
          uom: item.uom,
          lineTotal: Number(item.lineTotal),
          expiredDate:
            item.expiredDate != null ? item.expiredDate.toISOString().slice(0, 10) : null,
        }),
      ),
    };
  }
}
