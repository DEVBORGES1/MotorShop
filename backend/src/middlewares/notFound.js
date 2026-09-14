import { ApiError } from '../utils/ApiError.js';

/**
 * Captura qualquer rota não registrada e a encaminha ao tratamento central,
 * para que um 404 tenha exatamente o mesmo envelope de qualquer outro erro.
 */
export function notFound(req, res, next) {
  const path = `${req.method} ${req.originalUrl.slice(0, 200)}`;
  next(ApiError.notFound(`Rota não encontrada: ${path}`));
}
