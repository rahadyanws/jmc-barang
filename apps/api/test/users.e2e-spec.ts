import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { loginAs } from './helpers';

describe('Users (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminCookie: string;
  let operatorCookie: string;
  let adminId: string;
  let createdUserId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    await app.init();
    prisma = app.get(PrismaService);
    adminCookie = await loginAs(app, 'administrator', 'Admin12345');
    operatorCookie = await loginAs(app, 'operator1', 'Operator12345');

    const admin = await prisma.user.findUniqueOrThrow({
      where: { username: 'administrator' },
      select: { id: true },
    });
    adminId = admin.id;
  });

  afterAll(async () => {
    await prisma.incomingGoods.deleteMany({
      where: { origin: 'E2E Users Fixture' },
    });
    await prisma.user.deleteMany({
      where: { username: { in: ['e2eoperator', 'e2eadmin'] } },
    });
    await app.close();
  });

  it('operator mendapat 403 pada list user (RBAC, AC-02)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Cookie', operatorCookie)
      .expect(403);

    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('operator mendapat 403 pada options user', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/users/options')
      .query({ role: 'OPERATOR' })
      .set('Cookie', operatorCookie)
      .expect(403);
  });

  it('admin melihat daftar user dengan filter role', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/users')
      .query({ role: 'OPERATOR', search: 'budi' })
      .set('Cookie', adminCookie)
      .expect(200);

    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0]).toMatchObject({ username: 'operator1' });
    expect(res.body.data[0]).not.toHaveProperty('passwordHash');
  });

  it('options hanya mengembalikan user aktif', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/users/options')
      .query({ role: 'OPERATOR' })
      .set('Cookie', adminCookie)
      .expect(200);

    const usernames = (res.body.data as Array<{ username: string }>).map((u) => u.username);
    expect(usernames).not.toContain('operator3');
  });

  it('password lemah ditolak (BR-03, AC-10)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Cookie', adminCookie)
      .send({
        username: 'e2eweak',
        password: 'lowercaseonly',
        name: 'User Lemah',
        email: 'lemah@jmc-indonesia.test',
        role: 'OPERATOR',
      })
      .expect(400);

    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('membuat user baru; username di-lowercase; tanpa passwordHash (AS-13)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Cookie', adminCookie)
      .send({
        username: 'E2EOperator',
        password: 'Operator12345',
        name: 'Siti E2E',
        email: 'Siti.E2E@JMC-Indonesia.test',
        role: 'OPERATOR',
      })
      .expect(201);

    expect(res.body.data).toMatchObject({
      username: 'e2eoperator',
      email: 'siti.e2e@jmc-indonesia.test',
      role: 'OPERATOR',
      isLocked: false,
    });
    expect(res.body.data).not.toHaveProperty('passwordHash');
    createdUserId = res.body.data.id;
  });

  it('username duplikat → 409 CONFLICT_DUPLICATE (BR-04)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Cookie', adminCookie)
      .send({
        username: 'Administrator',
        password: 'Admin12345',
        name: 'Duplikat Admin',
        email: 'lain@jmc-indonesia.test',
        role: 'ADMIN',
      })
      .expect(409);

    expect(res.body.error.code).toBe('CONFLICT_DUPLICATE');
    expect(res.body.error.details).toContainEqual(expect.objectContaining({ field: 'username' }));
  });

  it('email duplikat → 409 CONFLICT_DUPLICATE (field email)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Cookie', adminCookie)
      .send({
        username: 'e2eother',
        password: 'Operator12345',
        name: 'Duplikat Email',
        email: 'budi.santoso@jmc-indonesia.test',
        role: 'OPERATOR',
      })
      .expect(409);

    expect(res.body.error.details).toContainEqual(expect.objectContaining({ field: 'email' }));
  });

  it('mengunci diri sendiri → 409 SELF_ACTION_FORBIDDEN (BR-05)', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/users/${adminId}/lock`)
      .set('Cookie', adminCookie)
      .send({ locked: true })
      .expect(409);

    expect(res.body.error.code).toBe('SELF_ACTION_FORBIDDEN');
  });

  it('menghapus diri sendiri → 409 SELF_ACTION_FORBIDDEN (BR-05)', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/users/${adminId}`)
      .set('Cookie', adminCookie)
      .expect(409);

    expect(res.body.error.code).toBe('SELF_ACTION_FORBIDDEN');
  });

  it('menurunkan role admin terakhir menjadi Operator → 409 LAST_ADMIN (BR-05)', async () => {
    const res = await request(app.getHttpServer())
      .put(`/api/v1/users/${adminId}`)
      .set('Cookie', adminCookie)
      .send({
        username: 'administrator',
        name: 'Administrator JMC',
        email: 'admin@jmc-indonesia.test',
        role: 'OPERATOR',
      })
      .expect(409);

    expect(res.body.error.code).toBe('LAST_ADMIN');
  });

  it('mengunci & membuka kunci operator', async () => {
    const lockRes = await request(app.getHttpServer())
      .patch(`/api/v1/users/${createdUserId}/lock`)
      .set('Cookie', adminCookie)
      .send({ locked: true })
      .expect(200);

    expect(lockRes.body.data).toMatchObject({ id: createdUserId, isLocked: true });

    const unlockRes = await request(app.getHttpServer())
      .patch(`/api/v1/users/${createdUserId}/lock`)
      .set('Cookie', adminCookie)
      .send({ locked: false })
      .expect(200);

    expect(unlockRes.body.data.isLocked).toBe(false);
  });

  it('mengubah user tanpa password (AS-10) tetap bisa login dengan password lama', async () => {
    await request(app.getHttpServer())
      .put(`/api/v1/users/${createdUserId}`)
      .set('Cookie', adminCookie)
      .send({
        username: 'e2eoperator',
        password: undefined,
        name: 'Siti Rahmawati E2E',
        email: 'siti.e2e@jmc-indonesia.test',
        role: 'OPERATOR',
      })
      .expect(200);

    await loginAs(app, 'e2eoperator', 'Operator12345');
  });

  it('menghapus user dengan transaksi → 409 CONFLICT_IN_USE (BR-09)', async () => {
    const subCategory = await prisma.subCategory.findFirstOrThrow({
      select: { id: true, priceLimit: true },
    });
    await prisma.incomingGoods.create({
      data: {
        operatorId: createdUserId,
        createdById: createdUserId,
        subCategoryId: subCategory.id,
        origin: 'E2E Users Fixture',
        priceLimitSnapshot: subCategory.priceLimit,
        totalAmount: 0,
      },
    });

    const res = await request(app.getHttpServer())
      .delete(`/api/v1/users/${createdUserId}`)
      .set('Cookie', adminCookie)
      .expect(409);

    expect(res.body.error.code).toBe('CONFLICT_IN_USE');
  });

  it('menghapus user tanpa transaksi → 204', async () => {
    await prisma.incomingGoods.deleteMany({
      where: { origin: 'E2E Users Fixture' },
    });

    await request(app.getHttpServer())
      .delete(`/api/v1/users/${createdUserId}`)
      .set('Cookie', adminCookie)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/api/v1/users/${createdUserId}`)
      .set('Cookie', adminCookie)
      .expect(404);
  });
});
