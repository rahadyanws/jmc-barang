import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { BadRequestException, Injectable } from '@nestjs/common';

import { MAX_ATTACHMENT_MB } from '@jmc/shared';

import { env } from '../../config/env';

const ALLOWED_EXTENSIONS = ['doc', 'docx', 'zip'] as const;
type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];

const MIME_BY_EXTENSION: Record<AllowedExtension, readonly string[]> = {
  doc: ['application/msword'],
  docx: [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  zip: ['application/zip', 'application/x-zip-compressed'],
};

/** Magic bytes: OLE2 (.doc) & ZIP local file header (.docx/.zip). */
const MAGIC_BYTES: Record<AllowedExtension, readonly number[]> = {
  doc: [0xd0, 0xcf, 0x11, 0xe0],
  docx: [0x50, 0x4b, 0x03, 0x04],
  zip: [0x50, 0x4b, 0x03, 0x04],
};

const FILE_INVALID_MESSAGE =
  'Lampiran harus berformat doc, docx, atau zip (maks 4 MB)';

export interface IncomingAttachmentFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface ValidatedAttachment {
  fileName: string;
  ext: AllowedExtension;
  mime: string;
  size: number;
}

const LOCAL_BASE_DIR = resolve(process.cwd(), '.uploads');

function fileInvalidError(): BadRequestException {
  return new BadRequestException({
    code: 'FILE_INVALID',
    message: FILE_INVALID_MESSAGE,
  });
}

function sanitizeFileName(originalName: string): string {
  const base = originalName.split(/[\\/]/).pop() ?? originalName;
  const cleaned = base.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/_{2,}/g, '_');
  return cleaned.slice(0, 100) || 'lampiran';
}

function matchesMagicBytes(buffer: Buffer, expected: readonly number[]): boolean {
  if (buffer.length < expected.length) {
    return false;
  }
  return expected.every((byte, index) => buffer[index] === byte);
}

/**
 * BR-19 / AS-12: ekstensi doc|docx|zip, maks 4 MB, MIME sesuai, magic bytes valid.
 * Driver penyimpanan mengikuti env STORAGE_DRIVER (supabase untuk produksi, local untuk dev).
 */
@Injectable()
export class StorageService {
  get driver(): 'supabase' | 'local' {
    return env.STORAGE_DRIVER;
  }

  get maxAttachmentBytes(): number {
    return (env.MAX_ATTACHMENT_MB ?? MAX_ATTACHMENT_MB) * 1024 * 1024;
  }

  validateAttachment(file: IncomingAttachmentFile): ValidatedAttachment {
    const maxBytes = this.maxAttachmentBytes;
    if (file.size <= 0 || file.size > maxBytes) {
      throw fileInvalidError();
    }

    const dotIndex = file.originalname.lastIndexOf('.');
    if (dotIndex <= 0) {
      throw fileInvalidError();
    }
    const rawExt = file.originalname.slice(dotIndex + 1).toLowerCase();
    if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(rawExt)) {
      throw fileInvalidError();
    }
    const ext = rawExt as AllowedExtension;

    const allowedMimes = MIME_BY_EXTENSION[ext];
    const mimetype = file.mimetype.toLowerCase();
    if (!allowedMimes.includes(mimetype)) {
      throw fileInvalidError();
    }

    if (!matchesMagicBytes(file.buffer, MAGIC_BYTES[ext])) {
      throw fileInvalidError();
    }

    return {
      fileName: sanitizeFileName(file.originalname),
      ext,
      mime: file.mimetype,
      size: file.size,
    };
  }

  /** Key terstruktur: incoming/{incomingGoodsId}/{uuid}.{ext} — nama asli hanya di DB. */
  buildKey(incomingGoodsId: string, ext: AllowedExtension): string {
    return `incoming/${incomingGoodsId}/${randomUUID()}.${ext}`;
  }

  async upload(key: string, buffer: Buffer, mime: string): Promise<void> {
    if (env.STORAGE_DRIVER === 'supabase') {
      await this.supabaseRequest(`/object/${env.SUPABASE_BUCKET}/${key}`, {
        method: 'POST',
        headers: { 'Content-Type': mime, 'x-upsert': 'true' },
        body: buffer,
      });
      return;
    }
    const target = this.localPath(key);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, buffer);
  }

  /** Best effort: kegagalan delete storage tidak menggagalkan operasi bisnis. */
  async delete(key: string): Promise<void> {
    try {
      if (env.STORAGE_DRIVER === 'supabase') {
        await this.supabaseRequest(`/object/${env.SUPABASE_BUCKET}/${key}`, {
          method: 'DELETE',
        });
        return;
      }
      await rm(this.localPath(key), { force: true });
    } catch {
      // best effort
    }
  }

  async readLocal(key: string): Promise<Buffer> {
    return readFile(this.localPath(key));
  }

  /** Signed URL Supabase berumur pendek; driver local memakai endpoint content API. */
  async createSignedUrl(key: string, expiresInSeconds = 60): Promise<string> {
    const response = await this.supabaseRequest(
      `/object/sign/${env.SUPABASE_BUCKET}/${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: Buffer.from(JSON.stringify({ expiresIn: expiresInSeconds })),
      },
    );
    const payload = (await response.json()) as { signedURL?: string };
    const signedPath = payload.signedURL;
    if (typeof signedPath !== 'string' || signedPath.length === 0) {
      throw new BadRequestException({
        code: 'STORAGE_ERROR',
        message: 'Gagal membuat tautan unduhan',
      });
    }
    return `${env.SUPABASE_URL}/storage/v1${signedPath}`;
  }

  private localPath(key: string): string {
    return resolve(LOCAL_BASE_DIR, key);
  }

  private async supabaseRequest(
    path: string,
    init: { method: string; headers?: Record<string, string>; body?: Buffer },
  ): Promise<Response> {
    if (env.SUPABASE_URL === undefined || env.SUPABASE_SERVICE_ROLE_KEY === undefined) {
      throw new BadRequestException({
        code: 'STORAGE_ERROR',
        message: 'Storage belum dikonfigurasi',
      });
    }
    const response = await fetch(`${env.SUPABASE_URL}/storage/v1${path}`, {
      method: init.method,
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        ...init.headers,
      },
      body: init.body,
    });
    if (!response.ok && response.status !== 404) {
      throw new BadRequestException({
        code: 'STORAGE_ERROR',
        message: 'Operasi storage gagal',
      });
    }
    return response;
  }
}
