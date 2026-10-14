import {
  BadRequestException,
  ConflictException,
  HttpException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import type {
  CreateIncomingGoodsInput,
  SessionUser,
  UpdateIncomingGoodsInput,
} from '../../shared';

import type { PrismaService } from '../../prisma/prisma.service';
import type { StorageService } from '../storage/storage.service';
import { IncomingGoodsService } from './incoming-goods.service';

const ADMIN_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const OPERATOR_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const OTHER_OPERATOR_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const HEADER_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const SUB_CATEGORY_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const CATEGORY_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
const ITEM_ID = '11111111-1111-1111-1111-111111111111';

const CATEGORY = { id: CATEGORY_ID, code: 'PK', name: 'Perlengkapan Kantor' };
const PRICE_LIMIT = 500_000;

const admin: SessionUser = {
  id: ADMIN_ID,
  username: 'administrator',
  name: 'Administrator JMC',
  email: 'admin@jmc-indonesia.test',
  role: 'ADMIN',
};

const operator: SessionUser = {
  id: OPERATOR_ID,
  username: 'operator1',
  name: 'Budi Santoso',
  email: 'budi.santoso@jmc-indonesia.test',
  role: 'OPERATOR',
};

function baseInput(
  overrides: Partial<CreateIncomingGoodsInput> = {},
): CreateIncomingGoodsInput {
  return {
    operatorId: OPERATOR_ID,
    subCategoryId: SUB_CATEGORY_ID,
    origin: 'PT. Sidomakmur',
    items: [{ name: 'Kertas HVS A4 60Gr', unitPrice: 61_000, quantity: 4, uom: 'Rim' }],
    ...overrides,
  };
}

function loadedHeader(overrides: Record<string, unknown> = {}) {
  return {
    id: HEADER_ID,
    transactionDate: new Date('2026-10-04T03:00:00.000Z'),
    origin: 'PT. Sidomakmur',
    letterNumber: null,
    unit: 'Gudang Utama',
    totalAmount: 244_000,
    isVerified: false,
    attachmentName: null,
    attachmentSize: null,
    attachmentKey: null,
    operator: { id: OPERATOR_ID, name: 'Budi Santoso' },
    subCategory: {
      id: SUB_CATEGORY_ID,
      name: 'Alat Tulis',
      priceLimit: PRICE_LIMIT,
      category: CATEGORY,
    },
    items: [
      {
        id: ITEM_ID,
        lineNo: 1,
        itemCode: 'PK0001',
        name: 'Kertas HVS A4 60Gr',
        unitPrice: 61_000,
        quantity: 4,
        uom: 'Rim',
        lineTotal: 244_000,
        expiredDate: null,
      },
    ],
    ...overrides,
  };
}

interface PrismaMock {
  $transaction: jest.Mock;
  user: { findUnique: jest.Mock };
  subCategory: { findUnique: jest.Mock };
  incomingGoods: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  incomingGoodsItem: {
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    deleteMany: jest.Mock;
  };
  itemCodeCounter: { upsert: jest.Mock };
}

interface StorageMock {
  driver: string;
  maxAttachmentBytes: number;
  validateAttachment: jest.Mock;
  buildKey: jest.Mock;
  upload: jest.Mock;
  delete: jest.Mock;
  readLocal: jest.Mock;
  createSignedUrl: jest.Mock;
}

async function catchError(promise: Promise<unknown>): Promise<HttpException> {
  try {
    await promise;
  } catch (error) {
    return error as HttpException;
  }
  throw new Error('Expected promise to reject');
}

describe('IncomingGoodsService business rules', () => {
  let prisma: PrismaMock;
  let storage: StorageMock;
  let service: IncomingGoodsService;

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(async (arg: unknown) => {
        if (typeof arg === 'function') {
          return (arg as (tx: PrismaMock) => Promise<unknown>)(prisma);
        }
        return Promise.all(arg as Array<Promise<unknown>>);
      }),
      user: { findUnique: jest.fn() },
      subCategory: { findUnique: jest.fn() },
      incomingGoods: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      incomingGoodsItem: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
      itemCodeCounter: { upsert: jest.fn() },
    };
    storage = {
      driver: 'local',
      maxAttachmentBytes: 4 * 1024 * 1024,
      validateAttachment: jest.fn(),
      buildKey: jest.fn(),
      upload: jest.fn(),
      delete: jest.fn(),
      readLocal: jest.fn(),
      createSignedUrl: jest.fn(),
    };
    service = new IncomingGoodsService(
      prisma as unknown as PrismaService,
      storage as unknown as StorageService,
    );

    prisma.subCategory.findUnique.mockResolvedValue({
      id: SUB_CATEGORY_ID,
      name: 'Alat Tulis',
      priceLimit: PRICE_LIMIT,
      category: CATEGORY,
    });
    prisma.user.findUnique.mockResolvedValue({
      id: OPERATOR_ID,
      role: 'OPERATOR',
      isLocked: false,
    });
    prisma.itemCodeCounter.upsert.mockResolvedValue({ lastValue: 1 });
    prisma.incomingGoods.create.mockResolvedValue({ id: HEADER_ID });
    prisma.incomingGoods.findFirst.mockResolvedValue(loadedHeader());
  });

  describe('BR-13 price limit', () => {
    it('accepts total exactly equal to the limit (inclusive, AS-15)', async () => {
      await service.create(
        baseInput({
          items: [{ name: 'Map Folder', unitPrice: 250_000, quantity: 2, uom: 'Pcs' }],
        }),
        admin,
      );

      const created = prisma.incomingGoods.create.mock.calls[0][0];
      expect(created.data.totalAmount).toBe(PRICE_LIMIT);
      expect(created.data.priceLimitSnapshot).toBe(PRICE_LIMIT);
    });

    it('rejects total of limit + 1 with 422 PRICE_LIMIT_EXCEEDED and details', async () => {
      const error = await catchError(
        service.create(
          baseInput({
            items: [
              { name: 'Map Folder', unitPrice: 250_001, quantity: 2, uom: 'Pcs' },
            ],
          }),
          admin,
        ),
      );

      expect(error).toBeInstanceOf(UnprocessableEntityException);
      expect(error.getResponse()).toMatchObject({
        code: 'PRICE_LIMIT_EXCEEDED',
        details: { limit: PRICE_LIMIT, total: 500_002, excess: 2 },
      });
      expect(prisma.incomingGoods.create).not.toHaveBeenCalled();
    });

    it('revalidates against current limit on update', async () => {
      prisma.incomingGoods.findFirst.mockResolvedValueOnce({
        id: HEADER_ID,
        isVerified: false,
        transactionDate: new Date('2026-10-04T03:00:00.000Z'),
      });

      const updateInput: UpdateIncomingGoodsInput = {
        ...baseInput(),
        items: [{ name: 'Kertas', unitPrice: 999_999, quantity: 1, uom: 'Rim' }],
      };
      const error = await catchError(service.update(HEADER_ID, updateInput, admin));

      expect(error).toBeInstanceOf(UnprocessableEntityException);
      expect(error.getResponse()).toMatchObject({ code: 'PRICE_LIMIT_EXCEEDED' });
    });
  });

  describe('BR-10 operator resolution', () => {
    it('forces operatorId to the acting operator and ignores client value', async () => {
      await service.create(
        baseInput({ operatorId: OTHER_OPERATOR_ID }),
        operator,
      );

      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      const created = prisma.incomingGoods.create.mock.calls[0][0];
      expect(created.data.operatorId).toBe(OPERATOR_ID);
    });

    it('rejects admin payload pointing to a non-operator user', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: ADMIN_ID,
        role: 'ADMIN',
        isLocked: false,
      });

      const error = await catchError(service.create(baseInput(), admin));

      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.getResponse()).toMatchObject({ code: 'OPERATOR_NOT_FOUND' });
    });
  });

  describe('BR-12 server-side totals', () => {
    it('computes lineTotal and totalAmount on the server', async () => {
      await service.create(
        baseInput({
          items: [
            { name: 'Kertas', unitPrice: 61_000, quantity: 4, uom: 'Rim' },
            { name: 'Bolpoin', unitPrice: 20_000, quantity: 5, uom: 'Dus' },
          ],
        }),
        admin,
      );

      const created = prisma.incomingGoods.create.mock.calls[0][0];
      expect(created.data.totalAmount).toBe(61_000 * 4 + 20_000 * 5);
      const itemCreates = created.data.items.create;
      expect(itemCreates[0].lineTotal).toBe(244_000);
      expect(itemCreates[1].lineTotal).toBe(100_000);
    });
  });

  describe('BR-21 item codes + BR-23 atomicity', () => {
    it('allocates sequential codes from the category counter inside one transaction', async () => {
      prisma.itemCodeCounter.upsert.mockResolvedValue({ lastValue: 2 });

      await service.create(
        baseInput({
          items: [
            { name: 'A', unitPrice: 10_000, quantity: 1, uom: 'Pcs' },
            { name: 'B', unitPrice: 10_000, quantity: 1, uom: 'Pcs' },
          ],
        }),
        admin,
      );

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.itemCodeCounter.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { categoryId: CATEGORY_ID },
          update: { lastValue: { increment: 2 } },
        }),
      );
      const created = prisma.incomingGoods.create.mock.calls[0][0];
      expect(created.data.items.create.map((item: { itemCode: string }) => item.itemCode)).toEqual([
        'PK0001',
        'PK0002',
      ]);
    });
  });

  describe('BR-17 verified lock', () => {
    it('rejects update of a verified transaction', async () => {
      prisma.incomingGoods.findFirst.mockResolvedValue({
        id: HEADER_ID,
        isVerified: true,
        transactionDate: new Date(),
      });

      const error = await catchError(
        service.update(HEADER_ID, baseInput() as UpdateIncomingGoodsInput, admin),
      );

      expect(error).toBeInstanceOf(ConflictException);
      expect(error.getResponse()).toMatchObject({ code: 'RECORD_VERIFIED_LOCKED' });
    });

    it('rejects delete of a verified transaction', async () => {
      prisma.incomingGoods.findFirst.mockResolvedValue({
        id: HEADER_ID,
        isVerified: true,
      });

      const error = await catchError(service.remove(HEADER_ID, admin));

      expect(error).toBeInstanceOf(ConflictException);
      expect(error.getResponse()).toMatchObject({ code: 'RECORD_VERIFIED_LOCKED' });
    });
  });

  describe('BR-18 operator scope', () => {
    it('returns 404 when operator reads another operator transaction', async () => {
      prisma.incomingGoods.findFirst.mockResolvedValue(null);

      const error = await catchError(service.getById(HEADER_ID, operator));

      expect(error).toBeInstanceOf(NotFoundException);
      expect(prisma.incomingGoods.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: HEADER_ID, operatorId: OPERATOR_ID },
        }),
      );
    });

    it('does not constrain admin queries', async () => {
      await service.getById(HEADER_ID, admin);

      expect(prisma.incomingGoods.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: HEADER_ID } }),
      );
    });

    it('returns 404 when operator deletes another operator transaction', async () => {
      prisma.incomingGoods.findFirst.mockResolvedValue(null);

      const error = await catchError(service.remove(HEADER_ID, operator));

      expect(error).toBeInstanceOf(NotFoundException);
      expect(prisma.incomingGoods.delete).not.toHaveBeenCalled();
    });
  });

  describe('BR-15 item sync on update', () => {
    it('updates kept items, inserts new ones with fresh codes, deletes missing ones', async () => {
      prisma.incomingGoods.findFirst
        .mockResolvedValueOnce({
          id: HEADER_ID,
          isVerified: false,
          transactionDate: new Date('2026-10-04T03:00:00.000Z'),
        })
        .mockResolvedValue(loadedHeader());
      prisma.incomingGoodsItem.findMany.mockResolvedValue([
        { id: ITEM_ID },
        { id: '22222222-2222-2222-2222-222222222222' },
      ]);
      prisma.itemCodeCounter.upsert.mockResolvedValue({ lastValue: 5 });

      const updateInput: UpdateIncomingGoodsInput = {
        ...baseInput(),
        items: [
          {
            id: ITEM_ID,
            name: 'Kertas HVS A4 60Gr (edit)',
            unitPrice: 60_000,
            quantity: 4,
            uom: 'Rim',
          },
          { name: 'Baru', unitPrice: 10_000, quantity: 1, uom: 'Pcs' },
        ],
      };

      await service.update(HEADER_ID, updateInput, admin);

      // item lama yang tidak ada di payload → dihapus
      expect(prisma.incomingGoodsItem.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { in: ['22222222-2222-2222-2222-222222222222'] },
          }),
        }),
      );
      // item tersimpan → update tanpa kode baru
      expect(prisma.incomingGoodsItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: ITEM_ID },
          data: expect.objectContaining({ name: 'Kertas HVS A4 60Gr (edit)' }),
        }),
      );
      // item baru → kode dari counter (hanya 1)
      expect(prisma.itemCodeCounter.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { lastValue: { increment: 1 } },
        }),
      );
      expect(prisma.incomingGoodsItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ itemCode: 'PK0005', lineNo: 2 }),
        }),
      );
    });
  });

  describe('AS-11 expired date', () => {
    it('rejects expired date before transaction date (WIB day)', async () => {
      prisma.incomingGoods.findFirst.mockResolvedValueOnce({
        id: HEADER_ID,
        isVerified: false,
        transactionDate: new Date('2026-10-03T17:30:00.000Z'), // 04/10 WIB
      });

      const updateInput: UpdateIncomingGoodsInput = {
        ...baseInput(),
        items: [
          {
            name: 'Makanan',
            unitPrice: 10_000,
            quantity: 1,
            uom: 'Pcs',
            expiredDate: '2026-10-03', // 03/10 WIB — sebelum tanggal transaksi
          },
        ],
      };

      const error = await catchError(service.update(HEADER_ID, updateInput, admin));

      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.getResponse()).toMatchObject({ code: 'VALIDATION_ERROR' });
    });
  });

  describe('list query', () => {
    const listQuery = {
      page: 1,
      pageSize: 10,
      sortBy: 'totalAmount' as const,
      sortOrder: 'desc' as const,
    };

    beforeEach(() => {
      prisma.incomingGoods.findMany.mockResolvedValue([loadedHeader()]);
      prisma.incomingGoods.count.mockResolvedValue(1);
    });

    it('scopes operator list to own transactions (BR-18)', async () => {
      await service.list(listQuery, operator);

      expect(prisma.incomingGoods.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { AND: [{ operatorId: OPERATOR_ID }] },
        }),
      );
    });

    it('does not constrain admin list and applies stable sort', async () => {
      await service.list(listQuery, admin);

      const args = prisma.incomingGoods.findMany.mock.calls[0][0];
      expect(args.where).toEqual({ AND: [{}] });
      expect(args.orderBy).toEqual([{ totalAmount: 'desc' }, { id: 'asc' }]);
      expect(args.skip).toBe(0);
      expect(args.take).toBe(10);
    });

    it('maps rows through toDetail and returns pagination meta', async () => {
      const result = await service.list(listQuery, admin);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        id: HEADER_ID,
        totalAmount: 244_000,
        category: CATEGORY,
      });
      expect(result.meta).toEqual({ page: 1, pageSize: 10, totalItems: 1, totalPages: 1 });
    });
  });

  describe('getYears', () => {
    it('returns distinct years sorted desc based on WIB dates', async () => {
      prisma.incomingGoods.findMany.mockResolvedValue([
        { transactionDate: new Date('2026-10-04T03:00:00.000Z') },
        { transactionDate: new Date('2025-12-31T17:30:00.000Z') }, // 01/01/2026 WIB
        { transactionDate: new Date('2025-06-01T00:00:00.000Z') },
      ]);

      const years = await service.getYears(operator);

      expect(years).toEqual([2026, 2025]);
      expect(prisma.incomingGoods.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { operatorId: OPERATOR_ID },
        }),
      );
    });
  });

  describe('setVerification (AC-09)', () => {
    it('returns 404 when the transaction is outside the actor scope', async () => {
      prisma.incomingGoods.findFirst.mockResolvedValue(null);

      const error = await catchError(service.setVerification(HEADER_ID, true, operator));

      expect(error).toBeInstanceOf(NotFoundException);
      expect(prisma.incomingGoods.update).not.toHaveBeenCalled();
    });

    it('marks verified with verifiedAt and verifiedById (BR-17)', async () => {
      prisma.incomingGoods.findFirst.mockResolvedValue({ id: HEADER_ID });
      prisma.incomingGoods.update.mockResolvedValue({
        id: HEADER_ID,
        isVerified: true,
        verifiedAt: new Date('2026-10-13T10:00:00.000Z'),
      });

      const result = await service.setVerification(HEADER_ID, true, admin);

      expect(result).toEqual({
        id: HEADER_ID,
        isVerified: true,
        verifiedAt: '2026-10-13T10:00:00.000Z',
      });
      expect(prisma.incomingGoods.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: HEADER_ID },
          data: expect.objectContaining({
            isVerified: true,
            verifiedById: ADMIN_ID,
            verifiedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('un-verify clears verifiedAt and verifiedById', async () => {
      prisma.incomingGoods.findFirst.mockResolvedValue({ id: HEADER_ID });
      prisma.incomingGoods.update.mockResolvedValue({
        id: HEADER_ID,
        isVerified: false,
        verifiedAt: null,
      });

      const result = await service.setVerification(HEADER_ID, false, admin);

      expect(result).toEqual({ id: HEADER_ID, isVerified: false, verifiedAt: null });
      expect(prisma.incomingGoods.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isVerified: false, verifiedAt: null, verifiedById: null },
        }),
      );
    });
  });

  describe('BR-20 exportRows', () => {
    const exportQuery = {
      sortBy: 'transactionDate' as const,
      sortOrder: 'desc' as const,
    };

    beforeEach(() => {
      prisma.incomingGoods.findMany.mockResolvedValue([loadedHeader()]);
      prisma.incomingGoods.count.mockResolvedValue(1);
    });

    it('uses the same where/orderBy builder as list (no pagination)', async () => {
      const { data } = await service.exportRows(exportQuery, admin);

      const args = prisma.incomingGoods.findMany.mock.calls[0][0];
      expect(args.where).toEqual({ AND: [{}] });
      expect(args.orderBy).toEqual([{ transactionDate: 'desc' }, { id: 'asc' }]);
      expect(args.skip).toBeUndefined();
      expect(args.take).toBeUndefined();
      expect(data).toHaveLength(1);
    });

    it('throws 422 EXPORT_TOO_LARGE when count exceeds MAX_EXPORT_ROWS', async () => {
      prisma.incomingGoods.count.mockResolvedValue(10_001);

      const error = await catchError(service.exportRows(exportQuery, admin));

      expect(error).toBeInstanceOf(UnprocessableEntityException);
      expect(error.getResponse()).toMatchObject({ code: 'EXPORT_TOO_LARGE' });
      expect(prisma.incomingGoods.findMany).not.toHaveBeenCalled();
    });
  });

  describe('attachment (BR-19 / AS-12)', () => {
    const file = {
      originalname: 'dokumen.docx',
      mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 1024,
      buffer: Buffer.from([0x50, 0x4b, 0x03, 0x04]),
    };

    it('uploads attachment, replaces old storage object, updates DB columns', async () => {
      prisma.incomingGoods.findFirst.mockResolvedValue({
        id: HEADER_ID,
        isVerified: false,
        attachmentKey: 'incoming/id/old.docx',
        attachmentName: 'old.docx',
        attachmentMime: 'application/zip',
      });
      storage.validateAttachment.mockReturnValue({
        fileName: 'dokumen.docx',
        ext: 'docx',
        mime: file.mimetype,
        size: file.size,
      });
      storage.buildKey.mockReturnValue('incoming/id/new.docx');

      const result = await service.uploadAttachment(HEADER_ID, file, admin);

      expect(result).toEqual({ fileName: 'dokumen.docx', size: 1024 });
      expect(storage.upload).toHaveBeenCalledWith(
        'incoming/id/new.docx',
        file.buffer,
        file.mimetype,
      );
      expect(storage.delete).toHaveBeenCalledWith('incoming/id/old.docx');
      expect(prisma.incomingGoods.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: HEADER_ID },
          data: expect.objectContaining({
            attachmentKey: 'incoming/id/new.docx',
            attachmentName: 'dokumen.docx',
          }),
        }),
      );
    });

    it('rejects upload to a verified transaction (BR-17)', async () => {
      prisma.incomingGoods.findFirst.mockResolvedValue({
        id: HEADER_ID,
        isVerified: true,
        attachmentKey: null,
        attachmentName: null,
        attachmentMime: null,
      });

      const error = await catchError(service.uploadAttachment(HEADER_ID, file, admin));

      expect(error).toBeInstanceOf(ConflictException);
      expect(storage.upload).not.toHaveBeenCalled();
    });

    it('getAttachment on local driver returns API content url', async () => {
      prisma.incomingGoods.findFirst.mockResolvedValue({
        id: HEADER_ID,
        isVerified: false,
        attachmentKey: 'incoming/id/a.docx',
        attachmentName: 'dokumen.docx',
        attachmentMime: file.mimetype,
      });

      const result = await service.getAttachment(HEADER_ID, admin);

      expect(result).toEqual({
        url: `/incoming-goods/${HEADER_ID}/attachment/content`,
        fileName: 'dokumen.docx',
        expiresInSeconds: 60,
      });
    });

    it('getAttachment returns 404 when there is no attachment', async () => {
      prisma.incomingGoods.findFirst.mockResolvedValue({
        id: HEADER_ID,
        isVerified: false,
        attachmentKey: null,
        attachmentName: null,
        attachmentMime: null,
      });

      const error = await catchError(service.getAttachment(HEADER_ID, admin));

      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.getResponse()).toMatchObject({ code: 'ATTACHMENT_NOT_FOUND' });
    });

    it('removeAttachment clears DB columns and deletes storage object', async () => {
      prisma.incomingGoods.findFirst.mockResolvedValue({
        id: HEADER_ID,
        isVerified: false,
        attachmentKey: 'incoming/id/a.docx',
        attachmentName: 'dokumen.docx',
        attachmentMime: file.mimetype,
      });

      await service.removeAttachment(HEADER_ID, admin);

      expect(storage.delete).toHaveBeenCalledWith('incoming/id/a.docx');
      expect(prisma.incomingGoods.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            attachmentKey: null,
            attachmentName: null,
            attachmentSize: null,
            attachmentMime: null,
          },
        }),
      );
    });

    it('rejects attachment operations for out-of-scope transactions', async () => {
      prisma.incomingGoods.findFirst.mockResolvedValue(null);

      const error = await catchError(service.uploadAttachment(HEADER_ID, file, operator));

      expect(error).toBeInstanceOf(NotFoundException);
    });
  });
});
