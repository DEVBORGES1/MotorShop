import pino from 'pino';

import { env } from './env.js';

/**
 * Logger da aplicação.
 *
 * A lista de `redact` é a defesa contra o vazamento mais comum de todos:
 * credencial impressa em log de requisição.
 */
export const logger = pino({
  level: env.isTest ? 'silent' : env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'password',
      'passwordHash',
      'token',
      'accessToken',
      'refreshToken',
      // Dado pessoal de lead (R-08). O serviço já não o loga; isto cobre o
      // log acidental de um objeto inteiro no futuro.
      'phone',
      'email',
      '*.phone',
      '*.email',
      '*.password',
      '*.passwordHash',
      '*.token',
      '*.accessToken',
      '*.refreshToken',
    ],
    remove: true,
  },
  base: undefined,
});
