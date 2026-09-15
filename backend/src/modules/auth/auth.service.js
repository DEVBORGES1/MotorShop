import { USER_ROLE } from '@motorshop/shared';

import { logger } from '../../config/logger.js';
import { ApiError } from '../../utils/ApiError.js';
import * as userRepository from '../users/user.repository.js';
import { serializeUser } from '../users/user.serializer.js';
import * as repository from './auth.repository.js';
import { verifyPassword } from './password.js';
import {
  REFRESH_TTL_MS,
  generateRefreshToken,
  hashRefreshToken,
  packRefreshToken,
  signAccessToken,
  unpackRefreshToken,
} from './tokens.js';

/**
 * Mensagem ÚNICA para os três casos de falha de login: e-mail inexistente,
 * usuário desativado e senha errada. Distinguir os casos revelaria quais
 * e-mails estão cadastrados e quais contas existem.
 */
const INVALID_CREDENTIALS = 'E-mail ou senha inválidos';

/**
 * @returns {Promise<{ user: object, accessToken: string, refreshCookie: string }>}
 */
export async function login({ email, password, userAgent, ip }) {
  const user = await userRepository.findByEmailWithHash(email);

  // A verificação roda MESMO quando o usuário não existe (com um hash
  // fictício): sem isso, a resposta para e-mail inexistente voltaria mais
  // rápido, e a diferença de tempo vazaria quais e-mails estão cadastrados.
  const passwordMatches = await verifyPassword(user?.passwordHash, password);

  if (!user || !user.active || !passwordMatches) {
    throw new ApiError(401, INVALID_CREDENTIALS);
  }

  await userRepository.touchLastLogin(user._id);

  const { accessToken, refreshCookie } = await issueSession({ user, userAgent, ip });
  return { user: serializeUser(user), accessToken, refreshCookie };
}

/**
 * Renova a sessão com **rotação**: o refresh usado é revogado e um novo par é
 * emitido. Reapresentar um refresh já revogado é sinal de token roubado —
 * nesse caso TODAS as sessões do usuário caem.
 */
export async function refresh({ cookieValue, userAgent, ip }) {
  const parsed = unpackRefreshToken(cookieValue);
  if (!parsed) throw new ApiError(401, 'Sessão inválida');

  const stored = await repository.findByJti(parsed.jti);
  if (!stored) throw new ApiError(401, 'Sessão inválida');

  // Detecção de reuso: o token existe, mas já havia sido revogado.
  if (stored.revokedAt) {
    await repository.revokeAllForUser(stored.user);
    logger.warn(
      { userId: String(stored.user), jti: parsed.jti },
      'Refresh token revogado foi reapresentado — todas as sessões do usuário foram encerradas',
    );
    throw new ApiError(401, 'Sessão inválida');
  }

  if (stored.expiresAt <= new Date()) throw new ApiError(401, 'Sessão expirada');
  if (stored.tokenHash !== hashRefreshToken(parsed.secret)) {
    throw new ApiError(401, 'Sessão inválida');
  }

  // O usuário pode ter sido desativado depois do login.
  const user = await userRepository.findById(stored.user);
  if (!user || !user.active) throw new ApiError(401, 'Sessão inválida');

  await repository.revokeByJti(parsed.jti);

  const { accessToken, refreshCookie } = await issueSession({ user, userAgent, ip });
  return { user: serializeUser(user), accessToken, refreshCookie };
}

export async function logout(cookieValue) {
  const parsed = unpackRefreshToken(cookieValue);
  // Logout é idempotente: sem cookie válido, não há o que revogar e não é erro.
  if (parsed) await repository.revokeByJti(parsed.jti);
}

export async function getMe(userId) {
  const user = await userRepository.findById(userId);
  if (!user || !user.active) throw new ApiError(401, 'Sessão inválida');
  return serializeUser(user);
}

async function issueSession({ user, userAgent, ip }) {
  const { jti, secret } = generateRefreshToken();

  await repository.create({
    user: user._id,
    jti,
    tokenHash: hashRefreshToken(secret),
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    userAgent: userAgent?.slice(0, 300) ?? null,
    ip: ip ?? null,
  });

  return {
    accessToken: signAccessToken({ id: user._id, role: user.role ?? USER_ROLE.ADMIN }),
    refreshCookie: packRefreshToken({ jti, secret }),
  };
}
