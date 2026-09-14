import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Trava temporária das rotas administrativas.
 *
 * A autenticação só chega na FASE 3. Até lá, `/api/admin/*` permite escrita sem
 * credencial — aceitável em desenvolvimento, catastrófico em produção
 * (qualquer pessoa apagaria o estoque).
 *
 * Este middleware garante que um deploy acidental nesta fase **não** exponha
 * escrita: em produção, toda rota administrativa responde 503 até que
 * `authenticate` a substitua.
 *
 * REMOVER na FASE 3, ao introduzir autenticação de verdade.
 */
export function adminGuard(req, res, next) {
  if (env.isProduction) {
    return next(
      new ApiError(
        503,
        'Área administrativa indisponível: a autenticação será implementada na FASE 3.',
      ),
    );
  }
  return next();
}
