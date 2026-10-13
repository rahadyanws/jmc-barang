import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';
import type { MulterError } from 'multer';
import type { ZodError } from 'zod';

import type { ApiErrorDetail } from '@jmc/shared';

const STATUS_CODES_BY_DEFAULT_CODE: Record<number, string> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  405: 'METHOD_NOT_ALLOWED',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  415: 'UNSUPPORTED_MEDIA_TYPE',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'RATE_LIMITED',
  500: 'INTERNAL_ERROR',
  503: 'SERVICE_UNAVAILABLE',
};

const FALLBACK_MESSAGES: Record<number, string> = {
  400: 'Permintaan tidak valid',
  401: 'Sesi Anda tidak valid atau telah berakhir',
  403: 'Anda tidak memiliki akses ke resource ini',
  404: 'Data tidak ditemukan',
  405: 'Metode tidak diizinkan',
  409: 'Konflik data',
  413: 'Ukuran berkas terlalu besar',
  415: 'Tipe media tidak didukung',
  422: 'Data tidak dapat diproses',
  429: 'Terlalu banyak permintaan',
  500: 'Terjadi kesalahan pada server',
  503: 'Layanan tidak tersedia',
};

interface ErrorBody {
  code?: unknown;
  message?: unknown;
  details?: unknown;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestIdHeader = request.headers['x-request-id'];
    const requestId =
      typeof requestIdHeader === 'string' && requestIdHeader.length > 0
        ? requestIdHeader
        : crypto.randomUUID();

    const { status, code, message, details } = this.resolveError(exception);

    if (status >= 500) {
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.setHeader('X-Request-Id', requestId);
    response.status(status).json({
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
        requestId,
      },
    });
  }

  private resolveError(exception: unknown): {
    status: number;
    code: string;
    message: string;
    details?: ApiErrorDetail[] | Record<string, unknown>;
  } {
    if (exception instanceof ZodValidationException) {
      return {
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Permintaan tidak valid',
        details: this.zodErrorToDetails(exception.getZodError()),
      };
    }

    if (this.isMulterError(exception)) {
      return {
        status: 400,
        code: 'FILE_INVALID',
        message:
          exception.code === 'LIMIT_FILE_SIZE'
            ? 'Ukuran berkas melebihi batas maksimal'
            : 'Berkas tidak valid',
      };
    }

    if (exception instanceof HttpException) {
      return this.fromHttpException(exception);
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.fromPrismaError(exception);
    }

    return {
      status: 500,
      code: 'INTERNAL_ERROR',
      message: FALLBACK_MESSAGES[500],
    };
  }

  private fromHttpException(exception: HttpException): {
    status: number;
    code: string;
    message: string;
    details?: ApiErrorDetail[] | Record<string, unknown>;
  } {
    const status = exception.getStatus();
    const fallbackCode = STATUS_CODES_BY_DEFAULT_CODE[status] ?? 'INTERNAL_ERROR';
    const fallbackMessage =
      FALLBACK_MESSAGES[status] ?? 'Terjadi kesalahan pada server';

    const body = exception.getResponse();
    if (typeof body === 'string') {
      return { status, code: fallbackCode, message: body };
    }

    if (typeof body !== 'object' || body === null) {
      return { status, code: fallbackCode, message: fallbackMessage };
    }

    const errorBody = body as ErrorBody;
    const code =
      typeof errorBody.code === 'string' && errorBody.code.length > 0
        ? errorBody.code
        : fallbackCode;
    const message =
      typeof errorBody.message === 'string' && errorBody.message.length > 0
        ? errorBody.message
        : fallbackMessage;

    return {
      status,
      code,
      message,
      ...(errorBody.details !== undefined
        ? { details: errorBody.details as ApiErrorDetail[] | Record<string, unknown> }
        : {}),
    };
  }

  private fromPrismaError(exception: Prisma.PrismaClientKnownRequestError): {
    status: number;
    code: string;
    message: string;
    details?: ApiErrorDetail[] | Record<string, unknown>;
  } {
    switch (exception.code) {
      case 'P2002': {
        const target = exception.meta?.['target'];
        const fields = this.normalizePrismaTarget(target);
        return {
          status: 409,
          code: 'CONFLICT_DUPLICATE',
          message: 'Data dengan kode/email/username yang sama sudah ada',
          details: fields.map((field) => ({
            field,
            message: `Nilai ${field} sudah digunakan`,
          })),
        };
      }
      case 'P2003':
        return {
          status: 409,
          code: 'CONFLICT_IN_USE',
          message: 'Data masih digunakan oleh data lain dan tidak dapat dihapus',
        };
      case 'P2025':
        return {
          status: 404,
          code: 'NOT_FOUND',
          message: 'Data tidak ditemukan',
        };
      default:
        return {
          status: 500,
          code: 'INTERNAL_ERROR',
          message: FALLBACK_MESSAGES[500],
        };
    }
  }

  private isMulterError(exception: unknown): exception is MulterError {
    return (
      typeof exception === 'object' &&
      exception !== null &&
      (exception as { name?: unknown }).name === 'MulterError' &&
      typeof (exception as { code?: unknown }).code === 'string'
    );
  }

  private normalizePrismaTarget(target: unknown): string[] {
    if (typeof target === 'string') {
      return [target];
    }
    if (Array.isArray(target)) {
      return target.filter((item): item is string => typeof item === 'string');
    }
    return [];
  }

  private zodErrorToDetails(error: unknown): ApiErrorDetail[] {
    if (typeof error !== 'object' || error === null || !('issues' in error)) {
      return [];
    }
    const issues = (error as ZodError).issues;
    return issues.map((issue) => ({
      field: issue.path.length > 0 ? issue.path.join('.') : undefined,
      message: issue.message,
    }));
  }
}
