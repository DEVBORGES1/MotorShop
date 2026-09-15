import { verifyAccessToken } from '../modules/auth/tokens.js';
import * as userRepository from '../modules/users/user.repository.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Valida o access token e popula `req.user`.
 *
 * Confere o usuário no banco a cada requisição, em vez de confiar apenas no
 * token: sem isso, um administrador desativado continuaria com acesso até o
 * token expirar (até 15 minutos). Revogar acesso precisa valer na hora.
 */
export async function authenticate(req, res, next) {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(401, 'Autenticação necessária'));
  }

  const payload = verifyAccessToken(token);
  if (!payload) return next(new ApiError(401, 'Sessão inválida ou expirada'));

  const user = await userRepository.findById(payload.sub);
  if (!user || !user.active) return next(new ApiError(401, 'Sessão inválida'));

  // O papel vem do BANCO, não do token: um rebaixamento vale imediatamente.
  req.user = { id: String(user._id), role: user.role, name: user.name };
  return next();
}
