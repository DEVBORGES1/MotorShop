import { randomUUID } from 'node:crypto';

/**
 * Identificador por requisição, usado para correlacionar a resposta de erro
 * com a entrada de log correspondente — sem expor nada interno ao cliente.
 */
export function requestId(req, res, next) {
  req.id = randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
}
