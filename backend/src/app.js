import { existsSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';

import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { helmetOptions, permissionsPolicy } from './config/security.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFound } from './middlewares/notFound.js';
import { pageLimiter } from './middlewares/rateLimiters.js';
import { requestId } from './middlewares/requestId.js';
import { apiRoutes } from './routes/index.js';
import { createHtmlHandler, robots, sitemap } from './seo/seo.controller.js';
import { ApiError } from './utils/ApiError.js';

const DEFAULT_FRONTEND_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../frontend/dist',
);

/**
 * Monta a aplicação Express sem iniciar o servidor.
 * Separar `app` de `server` é o que torna a API testável com supertest.
 *
 * @param {{ frontendDir?: string }} [options] pasta do build do site público;
 *   sem `index.html` nela, o processo serve só a API (desenvolvimento com Vite).
 */
export function createApp({
  // Em teste, só com pasta explícita: o resultado não pode depender de haver
  // um build do frontend no disco.
  frontendDir = env.isTest ? null : (env.FRONTEND_DIST_DIR ?? DEFAULT_FRONTEND_DIR),
} = {}) {
  const app = express();

  // Quantos proxies à frente deste processo acrescentam `X-Forwarded-For`.
  // É o que dá o IP real do visitante — base de todo limite por IP. Precisa
  // bater com o deploy: a mais, o cliente forja o próprio IP e contorna os
  // limites; a menos, todos aparecem com o IP do proxy e se bloqueiam entre
  // si (docs/SECURITY.md).
  app.set('trust proxy', env.TRUST_PROXY_HOPS);
  app.disable('x-powered-by');

  app.use(requestId);
  app.use(helmet(helmetOptions()));
  app.use(permissionsPolicy);

  const corsOptions = {
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86_400,
  };

  app.use(
    cors((req, callback) => {
      const origin = req.header('Origin');
      // Sem Origin (curl, testes) ou da própria origem — o site servido por
      // este processo (§13.2), cujo POST também traz Origin — segue permitido.
      const sameOrigin = origin === `${req.protocol}://${req.get('host')}`;
      if (!origin || sameOrigin || env.corsOrigins.includes(origin)) {
        return callback(null, { ...corsOptions, origin: true });
      }
      return callback(new ApiError(403, 'Origem não permitida pelo CORS'));
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

  // SEO: dinâmicos, da base atual (§11.4).
  app.get('/robots.txt', pageLimiter, robots);
  app.get('/sitemap.xml', pageLimiter, sitemap);

  mountFrontend(app, frontendDir);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

/**
 * Site público servido pelo mesmo processo (ARCHITECTURE §13.2): estáticos do
 * build e, para as rotas do SPA, o index.html com meta injetada (§11.3).
 */
function mountFrontend(app, frontendDir) {
  if (!frontendDir) return;
  if (!existsSync(join(frontendDir, 'index.html'))) {
    logger.info({ frontendDir }, 'Build do site não encontrado — servindo só a API');
    return;
  }

  // O template cru (com meta padrão) não deve ser servido por esse caminho.
  app.get('/index.html', (req, res) => res.redirect(301, '/'));

  app.use(
    express.static(frontendDir, {
      index: false,
      setHeaders(res, filePath) {
        // Assets do Vite têm hash no nome: mudam de nome a cada build, então
        // podem ficar em cache para sempre (§12.4).
        const immutable = relative(frontendDir, filePath).split(sep)[0] === 'assets';
        res.set(
          'Cache-Control',
          immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
        );
      },
    }),
  );

  const servePage = createHtmlHandler(frontendDir);
  app.use((req, res, next) => {
    const isPage =
      (req.method === 'GET' || req.method === 'HEAD') &&
      !req.path.startsWith('/api/') &&
      req.path !== '/api' &&
      // Arquivo inexistente (/assets/x.js) é 404 comum, não página do SPA.
      !/\.[a-z0-9]+$/i.test(req.path);
    return isPage ? pageLimiter(req, res, () => servePage(req, res, next)) : next();
  });
}
