import { ok } from '../../utils/apiResponse.js';
import { getHealthStatus } from './health.service.js';

/** O controller traduz domínio → HTTP. Nenhuma regra vive aqui. */
export function getHealth(req, res) {
  const health = getHealthStatus();

  // 503 quando degradado: um health check que responde 200 com o banco fora do
  // ar não serve para o balanceador nem para o monitoramento.
  const statusCode = health.status === 'ok' ? 200 : 503;

  res.status(statusCode).json(ok(health, { message: 'API is running' }));
}
