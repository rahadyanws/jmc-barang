import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { loginAs } from './helpers';

describe('Master Data (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminCookie: string;
  let operatorCookie: string;
  let createdCategoryId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    await app.init();
    prisma = app.get(PrismaService);
    adminCookie = await loginAs(app, 'administrator', 'Admin12345');
    operatorCookie = await loginAs(app, 'operator1', 'Operator12345');
  });

  afterAll(async () => {
    await prisma.incomingGoods.deleteMany({
      where: { origin: 'E2E Master Data Fixture' },
    });
    await prisma.category.deleteMany({ where: { code: { startsWith: 'E2E' } } });
    await app.close();
  });

  describe('Kategori', () => {
    it('operator mendapat 403 pada list kategori (RBAC)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/categories')
        .set('Cookie', operatorCookie)
        .expect(403);

      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('operator dapat mengakses options kategori', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/categories/options')
        .set('Cookie', operatorCookie)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('admin melihat daftar kategori dengan meta paging', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/categories')
        .set('Cookie', adminCookie)
        .expect(200);

      expect(res.body.meta).toMatchObject({ page: 1, pageSize: 10 });
      expect(res.body.data[0]).toHaveProperty('code');
    });

    it('membuat kategori baru dan meng-uppercase kode (AS-13)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/categories')
        .set('Cookie', adminCookie)
        .send({ code: 'e2et', name: 'Kategori E2E' })
        .expect(201);

      expect(res.body.data).toMatchObject({ code: 'E2ET', name: 'Kategori E2E' });
      createdCategoryId = res.body.data.id;
    });

    it('kode duplikat menghasilkan 409 CONFLICT_DUPLICATE (field code)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/categories')
        .set('Cookie', adminCookie)
        .send({ code: 'pk', name: 'Duplikat' })
        .expect(409);

      expect(res.body.error.code).toBe('CONFLICT_DUPLICATE');
      expect(res.body.error.details).toContainEqual(
        expect.objectContaining({ field: 'code' }),
      );
    });

    it('kode invalid menghasilkan 400 VALIDATION_ERROR', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/categories')
        .set('Cookie', adminCookie)
        .send({ code: '', name: 'Tanpa Kode' })
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('search menemukan kategori berdasarkan kode', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/categories')
        .query({ search: 'e2et' })
        .set('Cookie', adminCookie)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(createdCategoryId);
    });

    it('mengubah kategori (PUT)', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/v1/categories/${createdCategoryId}`)
        .set('Cookie', adminCookie)
        .send({ code: 'E2ET', name: 'Kategori E2E Diubah' })
        .expect(200);

      expect(res.body.data.name).toBe('Kategori E2E Diubah');
    });

    it('menghapus kategori kosong → 204', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/categories/${createdCategoryId}`)
        .set('Cookie', adminCookie)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/api/v1/categories/${createdCategoryId}`)
        .set('Cookie', adminCookie)
        .expect(404);
    });

    it('menghapus kategori ber-sub → 409 CONFLICT_IN_USE (BR-07)', async () => {
      const categories = await request(app.getHttpServer())
        .get('/api/v1/categories/options')
        .set('Cookie', adminCookie)
        .expect(200);
      const pk = (categories.body.data as Array<{ code: string; id: string }>).find(
        (item) => item.code === 'PK',
      );
      expect(pk).toBeDefined();

      const res = await request(app.getHttpServer())
        .delete(`/api/v1/categories/${pk?.id}`)
        .set('Cookie', adminCookie)
        .expect(409);

      expect(res.body.error.code).toBe('CONFLICT_IN_USE');
    });

    it('id tidak valid menghasilkan 400', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/categories/bukan-uuid')
        .set('Cookie', adminCookie)
        .expect(400);
    });
  });

  describe('Sub Kategori', () => {
    let pkCategoryId: string;
    let createdSubId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/categories/options')
        .set('Cookie', adminCookie)
        .expect(200);
      const pk = (res.body.data as Array<{ code: string; id: string }>).find(
        (item) => item.code === 'PK',
      );
      pkCategoryId = pk?.id ?? '';
    });

    it('operator mendapat 403 pada list sub kategori', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/sub-categories')
        .set('Cookie', operatorCookie)
        .expect(403);
    });

    it('operator dapat mengakses options berantai', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/sub-categories/options')
        .query({ categoryId: pkCategoryId })
        .set('Cookie', operatorCookie)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      for (const item of res.body.data as Array<{ categoryId: string }>) {
        expect(item.categoryId).toBe(pkCategoryId);
      }
    });

    it('membuat sub kategori baru dengan batas harga', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/sub-categories')
        .set('Cookie', adminCookie)
        .send({ categoryId: pkCategoryId, name: 'Sub E2E', priceLimit: 250000 })
        .expect(201);

      expect(res.body.data).toMatchObject({ name: 'Sub E2E', priceLimit: 250000 });
      createdSubId = res.body.data.id;
    });

    it('duplikat nama case-insensitive pada kategori sama → 409', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/sub-categories')
        .set('Cookie', adminCookie)
        .send({ categoryId: pkCategoryId, name: 'sub e2e', priceLimit: 100000 })
        .expect(409);

      expect(res.body.error.code).toBe('CONFLICT_DUPLICATE');
    });

    it('categoryId tidak ada → 404', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/sub-categories')
        .set('Cookie', adminCookie)
        .send({
          categoryId: '00000000-0000-0000-0000-000000000000',
          name: 'Yatim',
          priceLimit: 100000,
        })
        .expect(404);
    });

    it('priceLimit 0 ditolak (400)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/sub-categories')
        .set('Cookie', adminCookie)
        .send({ categoryId: pkCategoryId, name: 'Murah', priceLimit: 0 })
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('search pada list menemukan sub kategori', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/sub-categories')
        .query({ search: 'sub e2e' })
        .set('Cookie', adminCookie)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(createdSubId);
    });

    it('menghapus sub kategori yang dipakai barang masuk → 409 CONFLICT_IN_USE (BR-08)', async () => {
      const operator = await prisma.user.findUniqueOrThrow({
        where: { username: 'operator1' },
        select: { id: true },
      });
      await prisma.incomingGoods.create({
        data: {
          operatorId: operator.id,
          createdById: operator.id,
          subCategoryId: createdSubId,
          origin: 'E2E Master Data Fixture',
          priceLimitSnapshot: 250000,
          totalAmount: 0,
        },
      });

      const res = await request(app.getHttpServer())
        .delete(`/api/v1/sub-categories/${createdSubId}`)
        .set('Cookie', adminCookie)
        .expect(409);

      expect(res.body.error.code).toBe('CONFLICT_IN_USE');
    });

    it('menghapus sub kategori kosong → 204', async () => {
      await prisma.incomingGoods.deleteMany({
        where: { origin: 'E2E Master Data Fixture' },
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/sub-categories/${createdSubId}`)
        .set('Cookie', adminCookie)
        .expect(204);
    });
  });

  describe('Paging (BR-22 pattern)', () => {
    it('kategori: default 10/halaman, page=2, tolak pageSize > 50', async () => {
      for (let i = 0; i < 11; i += 1) {
        await request(app.getHttpServer())
          .post('/api/v1/categories')
          .set('Cookie', adminCookie)
          .send({ code: `e2epg${String(i).padStart(2, '0')}`, name: `Kategori Paging ${i}` })
          .expect(201);
      }

      const page1 = await request(app.getHttpServer())
        .get('/api/v1/categories')
        .query({ search: 'Kategori Paging' })
        .set('Cookie', adminCookie)
        .expect(200);
      expect(page1.body.meta).toMatchObject({
        page: 1,
        pageSize: 10,
        totalItems: 11,
        totalPages: 2,
      });
      expect(page1.body.data).toHaveLength(10);

      const page2 = await request(app.getHttpServer())
        .get('/api/v1/categories')
        .query({ search: 'Kategori Paging', page: 2 })
        .set('Cookie', adminCookie)
        .expect(200);
      expect(page2.body.meta).toMatchObject({ page: 2, pageSize: 10, totalPages: 2 });
      expect(page2.body.data).toHaveLength(1);

      const tooBig = await request(app.getHttpServer())
        .get('/api/v1/categories')
        .query({ pageSize: 51 })
        .set('Cookie', adminCookie)
        .expect(400);
      expect(tooBig.body.error.code).toBe('VALIDATION_ERROR');

      await prisma.category.deleteMany({ where: { code: { startsWith: 'E2EPG' } } });
    });

    it('sub kategori: page=2 mengembalikan sisa baris', async () => {
      const category = await request(app.getHttpServer())
        .post('/api/v1/categories')
        .set('Cookie', adminCookie)
        .send({ code: 'e2esubpg', name: 'Kategori Sub Paging' })
        .expect(201);
      const pagingCategoryId: string = category.body.data.id;

      try {
        for (let i = 0; i < 11; i += 1) {
          await request(app.getHttpServer())
            .post('/api/v1/sub-categories')
            .set('Cookie', adminCookie)
            .send({
              categoryId: pagingCategoryId,
              name: `Sub Paging ${String(i).padStart(2, '0')}`,
              priceLimit: 100000,
            })
            .expect(201);
        }

        const page1 = await request(app.getHttpServer())
          .get('/api/v1/sub-categories')
          .query({ categoryId: pagingCategoryId })
          .set('Cookie', adminCookie)
          .expect(200);
        expect(page1.body.meta).toMatchObject({
          page: 1,
          pageSize: 10,
          totalItems: 11,
          totalPages: 2,
        });
        expect(page1.body.data).toHaveLength(10);

        const page2 = await request(app.getHttpServer())
          .get('/api/v1/sub-categories')
          .query({ categoryId: pagingCategoryId, page: 2 })
          .set('Cookie', adminCookie)
          .expect(200);
        expect(page2.body.meta).toMatchObject({ page: 2, pageSize: 10 });
        expect(page2.body.data).toHaveLength(1);
        expect(page2.body.data[0].name).toBe('Sub Paging 10');

        const tooBig = await request(app.getHttpServer())
          .get('/api/v1/sub-categories')
          .query({ pageSize: 51 })
          .set('Cookie', adminCookie)
          .expect(400);
        expect(tooBig.body.error.code).toBe('VALIDATION_ERROR');
      } finally {
        await prisma.subCategory.deleteMany({ where: { categoryId: pagingCategoryId } });
        await prisma.category.deleteMany({ where: { id: pagingCategoryId } });
      }
    });
  });
});
