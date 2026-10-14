import 'reflect-metadata';

import type { IncomingMessage, ServerResponse } from 'node:http';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { env } from './config/env';

type CachedServer = (req: IncomingMessage, res: ServerResponse) => unknown;

let cachedServer: CachedServer | undefined;

async function bootstrapServer(): Promise<CachedServer> {
    if (!cachedServer) {
        const app = await NestFactory.create(AppModule);
        const logger = new Logger('Bootstrap');

        app.use(helmet());
        app.setGlobalPrefix('api/v1');
        app.use(cookieParser());
        app.enableCors({ origin: env.CORS_ORIGINS, credentials: true });
        app.enableShutdownHooks();

        await app.init();

        // Simpan instance http server Express
        const expressApp = app.getHttpAdapter().getInstance();
        cachedServer = expressApp;

        // Jika dijalankan di lingkungan lokal (misal: npm run start:dev)
        if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
            await app.listen(env.PORT || 3000);
            logger.log(`API listening on http://localhost:${env.PORT || 3000} (GET /api/v1/health)`);
        }
    }

    const server = cachedServer;
    if (!server) {
        throw new Error('Server HTTP belum terinisialisasi');
    }
    return server;
}

// Handler untuk Vercel Serverless Function
export default async function handler(req: IncomingMessage, res: ServerResponse) {
    const server = await bootstrapServer();
    return server(req, res);
}

// Jalankan server jika dieksekusi secara langsung (pengembangan lokal)
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    bootstrapServer().catch((error: unknown) => {
        console.error('Failed to start the API', error);
        process.exit(1);
    });
}