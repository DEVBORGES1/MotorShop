import { ApiError } from '../utils/ApiError.js';

/**
 * Restringe a rota a determinados papéis. Sempre encadeado **depois** de
 * `authenticate` — autorizar sem autenticar não faz sentido.
 *
 * @param {...string} roles
 */
export function authorize(...roles) {
  const middleware = (req, res, next) => {
    if (!req.user) return next(new ApiError(401, 'Autenticação necessária'));

    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Você não tem permissão para esta operação'));
    }

    return next();
  };
  // Metadado lido pela matriz de permissões (tests/integration/permissions):
  // o teste descobre sozinho quais rotas exigem qual papel.
  middleware.roles = roles;
  return middleware;
}
