import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';

import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFound } from './middlewares/notFound.js';
import { requestId } from './middlewares/requestId.js';
import { apiRoutes } from './routes/index.js';
import { ApiError } from './utils/ApiError.js';

/**
 * Monta a aplicação Express sem iniciar o servidor.
 * Separar `app` de `server` é o que torna a API testável com supertest.
 */
export function createApp() {
  const app = express();

  // Necessário para que o IP real chegue atrás de proxy/CDN — base correta
  // para o rate limiting que entra na FASE 3.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(requestId);
  app.use(helmet());

  app.use(
    cors({
      origin(origin, callback) {
        // Requisições sem Origin (curl, testes, same-origin) seguem permitidas.
        if (!origin || env.corsOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new ApiError(403, 'Origem não permitida pelo CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86_400,
    }),
  );

  app.use(express.json({ limit: env.BODY_LIMIT }));
  // Necessário para ler o cookie httpOnly do refresh token.
  app.use(cookieParser());
  app.use(compression());

  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.id,
      // O health check é consultado por monitoramento; logá-lo só produz ruído.
      autoLogging: { ignore: (req) => req.url === '/api/health' },
    }),
  );

  app.use('/api', apiRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
