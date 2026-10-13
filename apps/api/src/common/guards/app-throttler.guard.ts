import { ExecutionContext, HttpException, Injectable } from '@nestjs/common';
import { ThrottlerGuard, type ThrottlerLimitDetail } from '@nestjs/throttler';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  override async throwThrottlingException(
    _context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    const retryAfterSeconds = Math.max(1, Math.ceil(throttlerLimitDetail.ttl / 1000));
    throw new HttpException(
      {
        code: 'RATE_LIMITED',
        message: `Terlalu banyak permintaan. Coba lagi dalam ${retryAfterSeconds} detik.`,
      },
      429,
    );
  }
}
