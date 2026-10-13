import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Response } from 'supertest';

export function firstSetCookie(res: Response): string {
  const raw = res.headers['set-cookie'];
  const first = Array.isArray(raw) ? raw[0] : raw;
  if (first == null) {
    throw new Error('Expected Set-Cookie header');
  }
  return first;
}

export function sessionCookiePair(res: Response): string {
  return firstSetCookie(res).split(';')[0];
}

export async function loginAs(
  app: INestApplication,
  username: string,
  password: string,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ username, password })
    .expect(200);
  return sessionCookiePair(res);
}
