import pino from 'pino';

import { env } from './env.js';

/**
 * O que nunca chega ao log — removido, não mascarado. É a defesa contra o
 * vazamento mais comum de todos: credencial impressa em log de requisição.
 * Exportado para o teste que confere a remoção com um logger de verdade.
 */
export const REDACT = {
  paths: [
    'req.headers.authorization',
    'req.headers.cookie',
    'res.headers["set-cookie"]',
    'password',
    'passwordHash',
    'token',
    'accessToken',
    'refreshToken',
    'signature',
    '*.signature',
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
};

/** Logger da aplicação (JSON, um evento por linha). */
export const logger = pino({
  level: env.isTest ? 'silent' : env.LOG_LEVEL,
  redact: REDACT,
  base: undefined,
});
