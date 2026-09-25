import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

import { env } from '../config/env.js';
import { fail } from '../utils/apiResponse.js';

/**
 * Limites por perfil de rota (ARCHITECTURE §8.3), revisados na FASE 10.
 *
 * Armazenamento em memória: suficiente para uma instância, que é a topologia
 * do MVP. Com múltiplas réplicas o contador precisa ser compartilhado — está
 * registrado como risco R-06.
 *
 * Os números vêm do uso esperado, não de tráfego medido (o site ainda não está
 * no ar): revisar com dados reais depois do go-live (docs/SECURITY.md).
 */

const handler = (req, res) => {
  res.status(429).json(
    fail('Muitas tentativas. Aguarde alguns minutos e tente novamente.', {
      requestId: req.id,
    }),
  );
};

/**
 * `ipKeyGenerator` normaliza o endereço antes de usá-lo como chave.
 *
 * Usar `req.ip` cru seria uma falha real: um atacante com uma faixa IPv6 (um
 * /64 tem 2^64 endereços) teria uma chave diferente a cada tentativa e
 * contornaria o limite por completo. O helper agrupa a faixa.
 */
const byIp = (req) => ipKeyGenerator(req.ip);

const MIN = 60 * 1000;

/**
 * A tabela de limites. Os testes percorrem cada linha e conferem que o
 * (limite + 1)º pedido recebe 429 — um limite novo entra aqui e já é testado.
 */
export const RATE_LIMITS = Object.freeze({
  /**
   * Login por IP **e** e-mail: 5 tentativas em 15 min para uma conta. Só por
   * IP, um escritório inteiro atrás de um NAT se bloquearia; só por e-mail,
   * trocar o e-mail contornaria.
   */
  login: {
    windowMs: 15 * MIN,
    limit: 5,
    keyGenerator: (req) => `${byIp(req)}:${String(req.body?.email ?? '').toLowerCase()}`,
  },
  /**
   * Login só por IP: 20 em 15 min, somando todas as contas. Sem este, o
   * limite acima deixava um IP testar a mesma senha em mil e-mails diferentes
   * (5 tentativas por e-mail, e-mails ilimitados) — credential stuffing.
   */
  loginIp: { windowMs: 15 * MIN, limit: 20, keyGenerator: byIp },
  /** Renovação de sessão: o painel renova a cada 15 min; 30 é folga larga. */
  refresh: { windowMs: 15 * MIN, limit: 30, keyGenerator: byIp },
  /** Formulários de lead: 5 por hora — generoso para pessoa, curto para spam. */
  leads: { windowMs: 60 * MIN, limit: 5, keyGenerator: byIp },
  /**
   * API pública: 900 em 15 min (~1 por segundo). Uma página faz 3 a 5
   * chamadas; operadoras móveis põem muitos clientes atrás do mesmo IP
   * (CGNAT), então o antigo 300 bloquearia gente de verdade antes de um robô.
   */
  publicApi: { windowMs: 15 * MIN, limit: 900, keyGenerator: byIp },
  /**
   * Páginas HTML, sitemap e robots: cada página de moto consulta o banco
   * (slug inexistente não fica em cache por muito tempo). Sem limite, pedir
   * slugs aleatórios seria uma forma barata de sobrecarregar o banco.
   */
  pages: { windowMs: 15 * MIN, limit: 600, keyGenerator: byIp },
  /** Painel: por usuário, não por IP — a equipe da loja divide a conexão. */
  adminApi: {
    windowMs: 15 * MIN,
    limit: 600,
    keyGenerator: (req) => req.user?.id ?? byIp(req),
  },
});

/**
 * Cria o limitador de uma linha da tabela. Em teste, os da aplicação ficam
 * desligados (atrapalhariam a suíte); o teste de limites cria os seus, ligados.
 */
export function createLimiter(name, overrides = {}) {
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    handler,
    skip: () => env.isTest,
    ...RATE_LIMITS[name],
    ...overrides,
  });
}

export const loginLimiter = createLimiter('login');
export const loginIpLimiter = createLimiter('loginIp');
export const refreshLimiter = createLimiter('refresh');
export const leadLimiter = createLimiter('leads');
export const publicApiLimiter = createLimiter('publicApi');
export const pageLimiter = createLimiter('pages');
export const adminApiLimiter = createLimiter('adminApi');
