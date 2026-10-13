import { BadRequestException } from '@nestjs/common';

import { StorageService } from './storage.service';

function makeFile(overrides: Partial<Parameters<StorageService['validateAttachment']>[0]> = {}) {
  return {
    originalname: 'dokumen.docx',
    mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 1024,
    buffer: Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00]),
    ...overrides,
  };
}

describe('StorageService (BR-19 validation)', () => {
  let service: StorageService;

  beforeEach(() => {
    service = new StorageService();
  });

  it('accepts a valid .docx with correct magic bytes', () => {
    const result = service.validateAttachment(makeFile());
    expect(result).toEqual({
      fileName: 'dokumen.docx',
      ext: 'docx',
      mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 1024,
    });
  });

  it('accepts a valid .doc (OLE2 magic bytes)', () => {
    const result = service.validateAttachment(
      makeFile({
        originalname: 'laporan.doc',
        mimetype: 'application/msword',
        buffer: Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1]),
      }),
    );
    expect(result.ext).toBe('doc');
  });

  it('rejects disallowed extension with FILE_INVALID', () => {
    expect(() =>
      service.validateAttachment(makeFile({ originalname: 'virus.exe' })),
    ).toThrow(BadRequestException);
  });

  it('rejects oversized file', () => {
    expect(() =>
      service.validateAttachment(makeFile({ size: 5 * 1024 * 1024 })),
    ).toThrow(BadRequestException);
  });

  it('rejects mismatched MIME', () => {
    expect(() =>
      service.validateAttachment(makeFile({ mimetype: 'application/zip' })),
    ).toThrow(BadRequestException);
  });

  it('rejects wrong magic bytes (zip extension but not a zip)', () => {
    expect(() =>
      service.validateAttachment(
        makeFile({
          originalname: 'bukan.zip',
          mimetype: 'application/zip',
          buffer: Buffer.from([0x00, 0x01, 0x02, 0x03]),
        }),
      ),
    ).toThrow(BadRequestException);
  });

  it('sanitizes dangerous file names', () => {
    const result = service.validateAttachment(
      makeFile({ originalname: '../..\\evil name!.docx' }),
    );
    expect(result.fileName).not.toContain('/');
    expect(result.fileName).not.toContain('\\');
    expect(result.fileName).not.toContain('..');
  });

  it('builds structured keys independent of the original name', () => {
    const key = service.buildKey('tx-1', 'docx');
    expect(key).toMatch(/^incoming\/tx-1\/[0-9a-f-]+\.docx$/);
  });
});
