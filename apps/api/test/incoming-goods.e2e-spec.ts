import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { loginAs } from './helpers';

describe('Incoming Goods (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminCookie: string;
  let operator1Cookie: string;
  let operator2Cookie: string;
  let subCategoryId: string;
  let operator1Id: string;
  let operator2Id: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    await app.init();
    prisma = app.get(PrismaService);

    adminCookie = await loginAs(app, 'administrator', 'Admin12345');
    operator1Cookie = await loginAs(app, 'operator1', 'Operator12345');
    operator2Cookie = await loginAs(app, 'operator2', 'Operator12345');

    const subCategory = await prisma.subCategory.findFirstOrThrow({
      where: { name: 'Alat Tulis' },
      select: { id: true },
    });
    subCategoryId = subCategory.id;

    const op1 = await prisma.user.findUniqueOrThrow({
      where: { username: 'operator1' },
      select: { id: true },
    });
    const op2 = await prisma.user.findUniqueOrThrow({
      where: { username: 'operator2' },
      select: { id: true },
    });
    operator1Id = op1.id;
    operator2Id = op2.id;
  });

  afterAll(async () => {
    await prisma.incomingGoods.deleteMany({
      where: { origin: { startsWith: 'E2E ' } },
    });
    await app.close();
  });

  async function createTransaction(
    cookie: string,
    overrides: Record<string, unknown> = {},
  ): Promise<request.Response> {
    return request(app.getHttpServer())
      .post('/api/v1/incoming-goods')
      .set('Cookie', cookie)
      .send({
        operatorId: operator1Id,
        subCategoryId,
        origin: 'E2E Incoming Goods',
        items: [{ name: 'Kertas HVS', unitPrice: 61_000, quantity: 4, uom: 'Rim' }],
        ...overrides,
      });
  }

  describe('POST /incoming-goods', () => {
    it('admin creates transaction with server-computed total and generated codes (BR-12, BR-21)', async () => {
      const res = await createTransaction(adminCookie);

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        origin: 'E2E Incoming Goods',
        totalAmount: 244_000,
        isVerified: false,
        unit: 'Gudang Utama',
      });
      expect(res.body.data.operator).toMatchObject({ id: operator1Id, name: 'Budi Santoso' });
      expect(res.body.data.category).toMatchObject({ code: 'PK' });
      expect(res.body.data.subCategory).toMatchObject({ priceLimit: 500_000 });
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0]).toMatchObject({
        lineNo: 1,
        itemCode: expect.stringMatching(/^PK\d{4,}$/),
        lineTotal: 244_000,
      });
      expect(res.body.data).not.toHaveProperty('priceLimitSnapshot');
    });

    it('operator create forces operatorId to self and ignores client value (BR-10)', async () => {
      const res = await createTransaction(operator1Cookie, { operatorId: operator2Id });

      expect(res.status).toBe(201);
      expect(res.body.data.operator.id).toBe(operator1Id);
    });

    it('rejects total over limit with 422 PRICE_LIMIT_EXCEEDED and details (BR-13)', async () => {
      const res = await createTransaction(adminCookie, {
        items: [{ name: 'Meja Kayu', unitPrice: 250_001, quantity: 2, uom: 'Pcs' }],
      });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('PRICE_LIMIT_EXCEEDED');
      expect(res.body.error.details).toEqual({
        limit: 500_000,
        total: 500_002,
        excess: 2,
      });
    });

    it('accepts total exactly equal to the limit (AS-15 inklusif)', async () => {
      const res = await createTransaction(adminCookie, {
        items: [{ name: 'Meja Kayu', unitPrice: 250_000, quantity: 2, uom: 'Pcs' }],
      });

      expect(res.status).toBe(201);
      expect(res.body.data.totalAmount).toBe(500_000);
    });

    it('rejects unknown keys such as client-side total (strict schema)', async () => {
      const res = await createTransaction(adminCookie, { total: 999 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects empty items (BR-14)', async () => {
      const res = await createTransaction(adminCookie, { items: [] });

      expect(res.status).toBe(400);
    });

    it('returns 404 SUBCATEGORY_NOT_FOUND for missing sub category', async () => {
      const res = await createTransaction(adminCookie, {
        subCategoryId: '00000000-0000-0000-0000-000000000000',
      });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('SUBCATEGORY_NOT_FOUND');
    });

    it('rejects admin payload with non-operator operatorId (404 OPERATOR_NOT_FOUND)', async () => {
      const res = await createTransaction(adminCookie, { operatorId: operator1Id.slice(0, 8) + '-0000-0000-0000-000000000000' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('OPERATOR_NOT_FOUND');
    });

    it('rejects expired date before transaction date (AS-11)', async () => {
      const res = await createTransaction(adminCookie, {
        items: [
          {
            name: 'Snack',
            unitPrice: 10_000,
            quantity: 1,
            uom: 'Pcs',
            expiredDate: '2000-01-01',
          },
        ],
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /incoming-goods/:id + BR-18 scope', () => {
    let createdId: string;

    beforeAll(async () => {
      const res = await createTransaction(operator1Cookie);
      createdId = res.body.data.id;
    });

    it('owner operator can read own transaction', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/incoming-goods/${createdId}`)
        .set('Cookie', operator1Cookie)
        .expect(200);

      expect(res.body.data.id).toBe(createdId);
      expect(res.body.data.attachment).toBeNull();
    });

    it('other operator gets 404 (BR-18, tidak bocorkan keberadaan)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/incoming-goods/${createdId}`)
        .set('Cookie', operator2Cookie)
        .expect(404);
    });

    it('admin can read any transaction', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/incoming-goods/${createdId}`)
        .set('Cookie', adminCookie)
        .expect(200);
    });

    it('unknown id returns 404', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/incoming-goods/00000000-0000-0000-0000-000000000000')
        .set('Cookie', adminCookie)
        .expect(404);
    });
  });

  describe('PUT /incoming-goods/:id (BR-15 sync, BR-17 lock)', () => {
    let createdId: string;
    let keptItemId: string;
    let droppedItemId: string;
    let keptItemCode: string;

    beforeAll(async () => {
      const res = await createTransaction(adminCookie, {
        items: [
          { name: 'Kertas A4', unitPrice: 60_000, quantity: 2, uom: 'Rim' },
          { name: 'Pulpen', unitPrice: 10_000, quantity: 5, uom: 'Pcs' },
        ],
      });
      createdId = res.body.data.id;
      keptItemId = res.body.data.items[0].id;
      keptItemCode = res.body.data.items[0].itemCode;
      droppedItemId = res.body.data.items[1].id;
    });

    it('syncs items per id — update kept, insert new, delete missing; codes stable (BR-15)', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/v1/incoming-goods/${createdId}`)
        .set('Cookie', adminCookie)
        .send({
          operatorId: operator1Id,
          subCategoryId,
          origin: 'E2E Incoming Goods Updated',
          items: [
            {
              id: keptItemId,
              name: 'Kertas A4 (diedit)',
              unitPrice: 61_000,
              quantity: 2,
              uom: 'Rim',
            },
            { name: 'Baru Ditambahkan', unitPrice: 15_000, quantity: 1, uom: 'Pcs' },
          ],
        })
        .expect(200);

      expect(res.body.data.origin).toBe('E2E Incoming Goods Updated');
      expect(res.body.data.totalAmount).toBe(61_000 * 2 + 15_000);
      expect(res.body.data.items).toHaveLength(2);

      const kept = res.body.data.items.find((item: { id: string }) => item.id === keptItemId);
      expect(kept).toMatchObject({
        itemCode: keptItemCode,
        name: 'Kertas A4 (diedit)',
        lineNo: 1,
      });

      const inserted = res.body.data.items.find(
        (item: { id: string }) => item.id !== keptItemId,
      );
      expect(inserted.itemCode).toMatch(/^PK\d{4,}$/);
      expect(inserted.id).not.toBe(droppedItemId);
    });

    it('rejects item id that does not belong to the transaction', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/incoming-goods/${createdId}`)
        .set('Cookie', adminCookie)
        .send({
          operatorId: operator1Id,
          subCategoryId,
          origin: 'E2E Incoming Goods Updated',
          items: [
            {
              id: '99999999-9999-4999-8999-999999999999',
              name: 'Asing',
              unitPrice: 10_000,
              quantity: 1,
              uom: 'Pcs',
            },
          ],
        })
        .expect(400);
    });

    it('operator cannot update another operator transaction (404, BR-18)', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/incoming-goods/${createdId}`)
        .set('Cookie', operator2Cookie)
        .send({
          operatorId: operator2Id,
          subCategoryId,
          origin: 'Hijack',
          items: [{ name: 'X', unitPrice: 10_000, quantity: 1, uom: 'Pcs' }],
        })
        .expect(404);
    });

    it('locks edit and delete once verified (BR-17)', async () => {
      await prisma.incomingGoods.update({
        where: { id: createdId },
        data: {
          isVerified: true,
          verifiedAt: new Date(),
          verifiedById: null,
        },
      });

      const putRes = await request(app.getHttpServer())
        .put(`/api/v1/incoming-goods/${createdId}`)
        .set('Cookie', adminCookie)
        .send({
          operatorId: operator1Id,
          subCategoryId,
          origin: 'E2E Incoming Goods Updated',
          items: [{ name: 'X', unitPrice: 10_000, quantity: 1, uom: 'Pcs' }],
        });
      expect(putRes.status).toBe(409);
      expect(putRes.body.error.code).toBe('RECORD_VERIFIED_LOCKED');

      const delRes = await request(app.getHttpServer())
        .delete(`/api/v1/incoming-goods/${createdId}`)
        .set('Cookie', adminCookie);
      expect(delRes.status).toBe(409);
      expect(delRes.body.error.code).toBe('RECORD_VERIFIED_LOCKED');
    });
  });

  describe('DELETE /incoming-goods/:id', () => {
    it('deletes own transaction and items cascade (204 then 404)', async () => {
      const res = await createTransaction(operator1Cookie);
      const id = res.body.data.id;

      await request(app.getHttpServer())
        .delete(`/api/v1/incoming-goods/${id}`)
        .set('Cookie', operator1Cookie)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/api/v1/incoming-goods/${id}`)
        .set('Cookie', operator1Cookie)
        .expect(404);

      const remaining = await prisma.incomingGoodsItem.count({ where: { incomingGoodsId: id } });
      expect(remaining).toBe(0);
    });

    it('operator delete another operator transaction returns 404 (BR-18)', async () => {
      const res = await createTransaction(operator1Cookie);
      const id = res.body.data.id;

      await request(app.getHttpServer())
        .delete(`/api/v1/incoming-goods/${id}`)
        .set('Cookie', operator2Cookie)
        .expect(404);
    });
  });

  describe('GET /incoming-goods (list)', () => {
    let pkCategoryId: string;
    let foSubCategoryId: string;

    beforeAll(async () => {
      await prisma.incomingGoods.deleteMany({
        where: { origin: { startsWith: 'E2E List' } },
      });

      const pkCategory = await prisma.category.findFirstOrThrow({
        where: { code: 'PK' },
        select: { id: true },
      });
      pkCategoryId = pkCategory.id;

      const foSub = await prisma.subCategory.findFirstOrThrow({
        where: { name: 'Makanan Ringan' },
        select: { id: true },
      });
      foSubCategoryId = foSub.id;

      for (let index = 0; index < 12; index += 1) {
        await createTransaction(adminCookie, {
          operatorId: operator1Id,
          origin: `E2E List ${String(index).padStart(2, '0')}`,
          items: [
            {
              name: `Baris ${index}`,
              unitPrice: 10_000 * (index + 1),
              quantity: 1,
              uom: 'Pcs',
            },
          ],
        });
      }
      await createTransaction(operator2Cookie, {
        operatorId: operator2Id,
        origin: 'E2E List Milik Operator Dua',
        items: [{ name: 'Milik op2', unitPrice: 10_000, quantity: 1, uom: 'Pcs' }],
      });
    });

    it('paginates 10 transactions per page with meta (BR-22)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/incoming-goods?search=E2E%20List&page=2')
        .set('Cookie', adminCookie)
        .expect(200);

      expect(res.body.meta).toMatchObject({ page: 2, pageSize: 10 });
      expect(res.body.meta.totalItems).toBeGreaterThanOrEqual(13);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].items.length).toBeGreaterThan(0);
      expect(res.body.data[0].operator).toHaveProperty('name');
      expect(res.body.data[0].category).toHaveProperty('code');
    });

    it('sorts by totalAmount desc stably across pages', async () => {
      const page1 = await request(app.getHttpServer())
        .get('/api/v1/incoming-goods?search=E2E%20List%200&sortBy=totalAmount&sortOrder=desc&pageSize=5')
        .set('Cookie', adminCookie)
        .expect(200);
      const page2 = await request(app.getHttpServer())
        .get('/api/v1/incoming-goods?search=E2E%20List%200&sortBy=totalAmount&sortOrder=desc&pageSize=5&page=2')
        .set('Cookie', adminCookie)
        .expect(200);

      const totals = [
        ...page1.body.data.map((row: { totalAmount: number }) => row.totalAmount),
        ...page2.body.data.map((row: { totalAmount: number }) => row.totalAmount),
      ];
      expect(totals).toEqual([...totals].sort((a, b) => b - a));
      expect(totals[0]).toBe(100_000); // E2E List 09 → 10_000 * 10
      expect(totals).toHaveLength(10);
    });

    it('searches origin case-insensitively', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/incoming-goods?search=e2e%20list%2003')
        .set('Cookie', adminCookie)
        .expect(200);

      expect(res.body.meta.totalItems).toBe(1);
      expect(res.body.data[0].origin).toBe('E2E List 03');
    });

    it('searches by sub category name (AC-06)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/incoming-goods?search=alat%20tulis&pageSize=50')
        .set('Cookie', adminCookie)
        .expect(200);

      expect(res.body.meta.totalItems).toBeGreaterThanOrEqual(12);
      for (const row of res.body.data) {
        expect(row.subCategory.name.toLowerCase()).toContain('tulis');
      }
    });

    it('filters by subCategoryId', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/incoming-goods?subCategoryId=${subCategoryId}&search=E2E%20List`)
        .set('Cookie', adminCookie)
        .expect(200);

      expect(res.body.meta.totalItems).toBeGreaterThanOrEqual(12);
      for (const row of res.body.data) {
        expect(row.subCategory.id).toBe(subCategoryId);
      }
    });

    it('returns empty when categoryId and subCategoryId do not match', async () => {
      const res = await request(app.getHttpServer())
        .get(
          `/api/v1/incoming-goods?categoryId=${pkCategoryId}&subCategoryId=${foSubCategoryId}`,
        )
        .set('Cookie', adminCookie)
        .expect(200);

      expect(res.body.meta.totalItems).toBe(0);
      expect(res.body.data).toEqual([]);
    });

    it('filters by WIB year', async () => {
      const currentYear = new Date(Date.now() + 7 * 60 * 60 * 1000).getUTCFullYear();

      const hit = await request(app.getHttpServer())
        .get(`/api/v1/incoming-goods?year=${currentYear}&search=E2E%20List`)
        .set('Cookie', adminCookie)
        .expect(200);
      expect(hit.body.meta.totalItems).toBeGreaterThanOrEqual(12);

      const miss = await request(app.getHttpServer())
        .get('/api/v1/incoming-goods?year=2020&search=E2E%20List')
        .set('Cookie', adminCookie)
        .expect(200);
      expect(miss.body.meta.totalItems).toBe(0);
    });

    it('scopes operator list to own transactions (BR-18)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/incoming-goods?search=E2E%20List&pageSize=50')
        .set('Cookie', operator1Cookie)
        .expect(200);

      expect(res.body.meta.totalItems).toBe(12);
      for (const row of res.body.data) {
        expect(row.operator.id).toBe(operator1Id);
        expect(row.origin).not.toBe('E2E List Milik Operator Dua');
      }
    });

    it('rejects unauthenticated list request', async () => {
      await request(app.getHttpServer()).get('/api/v1/incoming-goods').expect(401);
    });
  });

  describe('GET /incoming-goods/years', () => {
    it('returns distinct years desc containing the current year', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/incoming-goods/years')
        .set('Cookie', adminCookie)
        .expect(200);

      const currentYear = new Date(Date.now() + 7 * 60 * 60 * 1000).getUTCFullYear();
      expect(res.body.data).toContain(currentYear);
      expect([...res.body.data].sort((a: number, b: number) => b - a)).toEqual(res.body.data);
    });

    it('scopes years to operator own transactions (BR-18)', async () => {
      await prisma.incomingGoods.deleteMany({
        where: { origin: { startsWith: 'E2E Years' } },
      });
      const currentYear = new Date(Date.now() + 7 * 60 * 60 * 1000).getUTCFullYear();

      // operator2 membuat transaksi di tahun berjalan, lalu kita paksa tahun lain via DB
      const res = await createTransaction(operator2Cookie, {
        operatorId: operator2Id,
        origin: 'E2E Years Operator Dua',
      });
      await prisma.incomingGoods.update({
        where: { id: res.body.data.id },
        data: { transactionDate: new Date('2019-06-01T00:00:00.000Z') },
      });

      const op2Years = await request(app.getHttpServer())
        .get('/api/v1/incoming-goods/years')
        .set('Cookie', operator2Cookie)
        .expect(200);
      expect(op2Years.body.data).toContain(2019);

      const op1Years = await request(app.getHttpServer())
        .get('/api/v1/incoming-goods/years')
        .set('Cookie', operator1Cookie)
        .expect(200);
      expect(op1Years.body.data).not.toContain(2019);

      await prisma.incomingGoods.deleteMany({
        where: { origin: { startsWith: 'E2E Years' } },
      });
      expect(currentYear).toBeGreaterThan(2019);
    });
  });

  describe('PATCH /incoming-goods/:id/verification (AC-09, BR-17)', () => {
    let createdId: string;

    beforeAll(async () => {
      await prisma.incomingGoods.deleteMany({
        where: { origin: { startsWith: 'E2E Verify' } },
      });
      const res = await createTransaction(adminCookie, {
        operatorId: operator1Id,
        origin: 'E2E Verify Toggle',
      });
      createdId = res.body.data.id;
    });

    it('admin verifies → isVerified true with verifiedAt; edit/delete locked', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/incoming-goods/${createdId}/verification`)
        .set('Cookie', adminCookie)
        .send({ verified: true })
        .expect(200);

      expect(res.body.data).toMatchObject({ id: createdId, isVerified: true });
      expect(typeof res.body.data.verifiedAt).toBe('string');

      const putRes = await request(app.getHttpServer())
        .put(`/api/v1/incoming-goods/${createdId}`)
        .set('Cookie', adminCookie)
        .send({
          operatorId: operator1Id,
          subCategoryId,
          origin: 'E2E Verify Toggle',
          items: [{ name: 'X', unitPrice: 10_000, quantity: 1, uom: 'Pcs' }],
        });
      expect(putRes.status).toBe(409);
      expect(putRes.body.error.code).toBe('RECORD_VERIFIED_LOCKED');

      await request(app.getHttpServer())
        .delete(`/api/v1/incoming-goods/${createdId}`)
        .set('Cookie', adminCookie)
        .expect(409);
    });

    it('operator verification toggle returns 403', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/incoming-goods/${createdId}/verification`)
        .set('Cookie', operator1Cookie)
        .send({ verified: false })
        .expect(403);
    });

    it('admin un-verify restores edit ability', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/incoming-goods/${createdId}/verification`)
        .set('Cookie', adminCookie)
        .send({ verified: false })
        .expect(200);

      expect(res.body.data).toMatchObject({
        id: createdId,
        isVerified: false,
        verifiedAt: null,
      });

      await request(app.getHttpServer())
        .put(`/api/v1/incoming-goods/${createdId}`)
        .set('Cookie', adminCookie)
        .send({
          operatorId: operator1Id,
          subCategoryId,
          origin: 'E2E Verify Toggle Edited',
          items: [{ name: 'X', unitPrice: 10_000, quantity: 1, uom: 'Pcs' }],
        })
        .expect(200);
    });

    it('verification on unknown id returns 404', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/incoming-goods/00000000-0000-0000-0000-000000000000/verification')
        .set('Cookie', adminCookie)
        .send({ verified: true })
        .expect(404);
    });

    it('rejects invalid body', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/incoming-goods/${createdId}/verification`)
        .set('Cookie', adminCookie)
        .send({ verified: 'yes' })
        .expect(400);
    });
  });

  describe('GET /incoming-goods/export (BR-20, AS-18)', () => {
    async function fetchExport(
      cookie: string,
      query: Record<string, string>,
    ): Promise<{ status: number; headers: Record<string, string>; body: Buffer }> {
      const res = await request(app.getHttpServer())
        .get('/api/v1/incoming-goods/export')
        .query(query)
        .set('Cookie', cookie)
        .buffer(true)
        .parse((response, callback) => {
          const chunks: Buffer[] = [];
          response.on('data', (chunk: Buffer) => chunks.push(chunk));
          response.on('end', () => callback(null, Buffer.concat(chunks)));
        });
      return res as unknown as {
        status: number;
        headers: Record<string, string>;
        body: Buffer;
      };
    }

    beforeAll(async () => {
      await prisma.incomingGoods.deleteMany({
        where: { origin: { startsWith: 'E2E Export' } },
      });
      await createTransaction(adminCookie, {
        origin: 'E2E Export Filtered',
        items: [{ name: 'Kertas Export', unitPrice: 50_000, quantity: 2, uom: 'Rim' }],
      });
    });

    afterAll(async () => {
      await prisma.incomingGoods.deleteMany({
        where: { origin: { startsWith: 'E2E Export' } },
      });
    });

    it('returns xlsx attachment with stamp filename and respects active search filter', async () => {
      const res = await fetchExport(adminCookie, {
        search: 'E2E Export Filtered',
        sortBy: 'totalAmount',
        sortOrder: 'asc',
      });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(res.headers['content-disposition']).toMatch(
        /^attachment; filename="barang-masuk_\d{8}-\d{6}\.xlsx"$/,
      );

      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(res.body as never);
      const sheet = workbook.getWorksheet('Barang Masuk');
      expect(sheet).toBeDefined();
      expect(sheet?.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 });

      const headers = sheet?.getRow(1).values as unknown[];
      expect(headers[1]).toBe('NO');
      expect(headers[11]).toBe('STATUS');

      const kodeCells: string[] = [];
      sheet?.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
          return;
        }
        const kode = row.getCell(6).value;
        if (typeof kode === 'string') {
          kodeCells.push(kode);
        }
      });
      expect(kodeCells.length).toBeGreaterThan(0);
      const origins = new Set<string>();
      sheet?.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
          return;
        }
        const asal = row.getCell(3).value;
        if (typeof asal === 'string') {
          origins.add(asal);
        }
      });
      expect([...origins]).toEqual(['E2E Export Filtered']);
    });

    it('scopes export to operator own transactions (BR-18)', async () => {
      await createTransaction(operator2Cookie, {
        operatorId: operator2Id,
        origin: 'E2E Export Operator Dua',
      });

      const res = await fetchExport(operator1Cookie, { search: 'E2E Export' });
      expect(res.status).toBe(200);

      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(res.body as never);
      const sheet = workbook.getWorksheet('Barang Masuk');
      const origins = new Set<string>();
      sheet?.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
          return;
        }
        const asal = row.getCell(3).value;
        if (typeof asal === 'string') {
          origins.add(asal);
        }
      });
      expect([...origins]).toEqual(['E2E Export Filtered']);
    });

    it('rejects unauthenticated export', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/incoming-goods/export')
        .expect(401);
    });
  });

  describe('GET /incoming-goods/:id/print (AS-19)', () => {
    let printId: string;

    beforeAll(async () => {
      await prisma.incomingGoods.deleteMany({
        where: { origin: { startsWith: 'E2E Print' } },
      });
      const res = await createTransaction(adminCookie, {
        origin: 'E2E Print Surat',
      });
      printId = res.body.data.id;
    });

    afterAll(async () => {
      await prisma.incomingGoods.deleteMany({
        where: { origin: { startsWith: 'E2E Print' } },
      });
    });

    it('returns inline PDF starting with %PDF', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/incoming-goods/${printId}/print`)
        .set('Cookie', adminCookie)
        .buffer(true)
        .parse((res, callback) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => callback(null, Buffer.concat(chunks)));
        });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toBe('inline');
      const buffer = res.body as Buffer;
      expect(buffer.subarray(0, 4).toString('ascii')).toBe('%PDF');
      expect(buffer.length).toBeGreaterThan(500);
    });

    it('returns 404 for unknown id', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/incoming-goods/00000000-0000-0000-0000-000000000000/print')
        .set('Cookie', adminCookie)
        .expect(404);
    });

    it('operator cannot print another operator transaction (BR-18)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/incoming-goods/${printId}/print`)
        .set('Cookie', operator2Cookie)
        .expect(404);
    });
  });

  describe('attachment lifecycle (BR-19, AS-12)', () => {
    const DOCX_MIME =
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const docxBuffer = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      Buffer.from('e2e-docx-payload'),
    ]);
    const exeBuffer = Buffer.from('MZ\x90\x00fake-exe');

    let attachmentId: string;

    beforeAll(async () => {
      await prisma.incomingGoods.deleteMany({
        where: { origin: { startsWith: 'E2E Attachment' } },
      });
      const res = await createTransaction(adminCookie, {
        origin: 'E2E Attachment',
      });
      attachmentId = res.body.data.id;
    });

    afterAll(async () => {
      await prisma.incomingGoods.deleteMany({
        where: { origin: { startsWith: 'E2E Attachment' } },
      });
    });

    it('uploads docx, returns metadata, serves content, then deletes (204)', async () => {
      const uploadRes = await request(app.getHttpServer())
        .post(`/api/v1/incoming-goods/${attachmentId}/attachment`)
        .set('Cookie', adminCookie)
        .attach('file', docxBuffer, { filename: 'dokumen e2e.docx', contentType: DOCX_MIME })
        .expect(201);

      expect(uploadRes.body.data).toEqual({ fileName: 'dokumen_e2e.docx', size: docxBuffer.length });

      const getRes = await request(app.getHttpServer())
        .get(`/api/v1/incoming-goods/${attachmentId}/attachment`)
        .set('Cookie', adminCookie)
        .expect(200);
      expect(getRes.body.data).toMatchObject({
        fileName: 'dokumen_e2e.docx',
        expiresInSeconds: 60,
      });
      expect(getRes.body.data.url).toContain(`/incoming-goods/${attachmentId}/attachment/content`);

      const contentRes = await request(app.getHttpServer())
        .get(`/api/v1/incoming-goods/${attachmentId}/attachment/content`)
        .set('Cookie', adminCookie)
        .expect(200);
      expect(contentRes.headers['content-type']).toContain(DOCX_MIME);

      await request(app.getHttpServer())
        .delete(`/api/v1/incoming-goods/${attachmentId}/attachment`)
        .set('Cookie', adminCookie)
        .expect(204);

      const missingRes = await request(app.getHttpServer())
        .get(`/api/v1/incoming-goods/${attachmentId}/attachment`)
        .set('Cookie', adminCookie)
        .expect(404);
      expect(missingRes.body.error.code).toBe('ATTACHMENT_NOT_FOUND');
    });

    it('rejects disallowed extension with 400 FILE_INVALID', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/incoming-goods/${attachmentId}/attachment`)
        .set('Cookie', adminCookie)
        .attach('file', exeBuffer, { filename: 'virus.exe', contentType: 'application/octet-stream' })
        .expect(400);
      expect(res.body.error.code).toBe('FILE_INVALID');
    });

    it('rejects wrong magic bytes with 400 FILE_INVALID', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/incoming-goods/${attachmentId}/attachment`)
        .set('Cookie', adminCookie)
        .attach('file', Buffer.from('not-a-zip-at-all'), {
          filename: 'palsu.zip',
          contentType: 'application/zip',
        })
        .expect(400);
      expect(res.body.error.code).toBe('FILE_INVALID');
    });

    it('rejects missing file field with 400 FILE_INVALID', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/incoming-goods/${attachmentId}/attachment`)
        .set('Cookie', adminCookie)
        .expect(400);
      expect(res.body.error.code).toBe('FILE_INVALID');
    });

    it('rejects upload to verified transaction with 409 (BR-17)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/incoming-goods/${attachmentId}/verification`)
        .set('Cookie', adminCookie)
        .send({ verified: true })
        .expect(200);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/incoming-goods/${attachmentId}/attachment`)
        .set('Cookie', adminCookie)
        .attach('file', docxBuffer, { filename: 'dokumen.docx', contentType: DOCX_MIME })
        .expect(409);
      expect(res.body.error.code).toBe('RECORD_VERIFIED_LOCKED');

      await request(app.getHttpServer())
        .patch(`/api/v1/incoming-goods/${attachmentId}/verification`)
        .set('Cookie', adminCookie)
        .send({ verified: false })
        .expect(200);
    });

    it('operator cannot manage another operator attachment (404, BR-18)', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/incoming-goods/${attachmentId}/attachment`)
        .set('Cookie', operator2Cookie)
        .attach('file', docxBuffer, { filename: 'dokumen.docx', contentType: DOCX_MIME })
        .expect(404);
    });
  });
});
