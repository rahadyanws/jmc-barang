import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

export type HealthResponse =
  | { status: 'ok'; db: 'up'; uptime: number }
  | { status: 'degraded'; db: 'down' };

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthResponse> {
    const isDatabaseUp = await this.isDatabaseUp();

    if (!isDatabaseUp) {
      throw new HttpException(
        { status: 'degraded', db: 'down' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return { status: 'ok', db: 'up', uptime: Math.round(process.uptime()) };
  }

  private async isDatabaseUp(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Database check failed: ${message}`);
      return false;
    }
  }
}
