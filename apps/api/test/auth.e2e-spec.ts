import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { Response } from 'supertest';

import { AppModule } from '../src/app.module';

const ADMIN_CREDENTIALS = { username: 'administrator', password: 'Admin12345' };

function firstSetCookie(res: Response): string {
  const raw = res.headers['set-cookie'];
  const first = Array.isArray(raw) ? raw[0] : raw;
  if (first == null) {
    throw new Error('Expected Set-Cookie header');
  }
  return first;
}

function sessionCookiePair(res: Response): string {
  return firstSetCookie(res).split(';')[0];
}

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/login returns user and sets httpOnly cookie', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(ADMIN_CREDENTIALS)
      .expect(200);

    expect(res.body.data.user).toMatchObject({
      username: 'administrator',
      role: 'ADMIN',
    });
    expect(res.body.data.user).not.toHaveProperty('passwordHash');

    const cookie = firstSetCookie(res);
    expect(cookie).toContain('jmc_session=');
    expect(cookie).toContain('HttpOnly');
  });

  it('POST /auth/login with wrong password returns 401 INVALID_CREDENTIALS', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'administrator', password: 'WrongPassword1' })
      .expect(401);

    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('POST /auth/login for locked user with correct password returns 403 ACCOUNT_LOCKED', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'operator3', password: 'Operator12345' })
      .expect(403);

    expect(res.body.error.code).toBe('ACCOUNT_LOCKED');
  });

  it('POST /auth/login rejects invalid body with 400 VALIDATION_ERROR', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({})
      .expect(400);

    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(res.body.error.details)).toBe(true);
  });

  it('GET /auth/me without token returns 401', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);

    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('GET /auth/me with session cookie returns user', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(ADMIN_CREDENTIALS)
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', sessionCookiePair(login))
      .expect(200);

    expect(res.body.data.user).toMatchObject({ username: 'administrator', role: 'ADMIN' });
  });

  it('GET /auth/me with Bearer token returns user', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(ADMIN_CREDENTIALS)
      .expect(200);

    const token = decodeURIComponent(sessionCookiePair(login).split('=')[1]);

    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.user).toMatchObject({ username: 'administrator' });
  });

  it('GET /health stays public without token', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);

    expect(res.body.data).toMatchObject({ status: 'ok' });
  });

  it('POST /auth/logout clears the session cookie', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(ADMIN_CREDENTIALS)
      .expect(200);

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', sessionCookiePair(login))
      .expect(204);

    expect(firstSetCookie(res)).toContain('jmc_session=;');
  });

  it('rate-limits login attempts per IP+username (5/menit)', async () => {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username: 'ratelimit-probe', password: 'WrongPassword1' })
        .expect(401);
    }

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'ratelimit-probe', password: 'WrongPassword1' })
      .expect(429);

    expect(res.body.error.code).toBe('RATE_LIMITED');
  });
});
