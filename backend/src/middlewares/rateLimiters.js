import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

import { env } from '../config/env.js';
import { fail } from '../utils/apiResponse.js';

/**
 * Limites por perfil de rota (ARCHITECTURE §8.3).
 *
 * Armazenamento em memória: suficiente para uma instância, que é a topologia
 * do MVP. Com múltiplas réplicas o contador precisa ser compartilhado — está
 * registrado como risco R-06.
 */

const handler = (req, res) => {
  res.status(429).json(
    fail('Muitas tentativas. Aguarde alguns minutos e tente novamente.', {
      requestId: req.id,
    }),
  );
};

const base = {
  standardHeaders: true,
  legacyHeaders: false,
  handler,
  // Em teste os limites atrapalhariam a suíte; são exercitados por testes
  // dedicados, que criam seus próprios limitadores.
  skip: () => env.isTest,
};

/**
 * `ipKeyGenerator` normaliza o endereço antes de usá-lo como chave.
 *
 * Usar `req.ip` cru seria uma falha real: um atacante com uma faixa IPv6 (um
 * /64 tem 2^64 endereços) teria uma chave diferente a cada tentativa e
 * contornaria o limite por completo. O helper agrupa a faixa.
 */
const byIp = (req) => ipKeyGenerator(req.ip);

/**
 * Login: a chave combina IP **e** e-mail. Só por IP, um escritório inteiro
 * atrás de um NAT se bloquearia; só por e-mail, trocar o e-mail contornaria.
 */
export const loginLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 5,
  keyGenerator: (req) => `${byIp(req)}:${String(req.body?.email ?? '').toLowerCase()}`,
});

export const refreshLimiter = rateLimit({ ...base, windowMs: 15 * 60 * 1000, limit: 30 });

export const publicApiLimiter = rateLimit({ ...base, windowMs: 15 * 60 * 1000, limit: 300 });

export const adminApiLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 600,
  keyGenerator: (req) => req.user?.id ?? byIp(req),
});
