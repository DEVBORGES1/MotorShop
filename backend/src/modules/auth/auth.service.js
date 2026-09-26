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
 * Janela em que reapresentar um refresh **recém-trocado** é outra aba (ou uma
 * resposta que se perdeu) renovando ao mesmo tempo — não roubo. Duas abas do
 * painel recarregadas juntas mandam o mesmo cookie; sem esta tolerância, a
 * segunda derrubava todas as sessões do usuário.
 */
export const ROTATION_GRACE_MS = 20_000;

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
 * Reapresentação de um refresh já revogado: renovação simultânea legítima,
 * sessão encerrada, ou roubo.
 *
 * @returns {Promise<'concurrent' | 'ended' | 'theft'>}
 */
async function classifyReuse(stored, secret) {
  const rotatedRecently =
    stored.replacedBy && Date.now() - new Date(stored.revokedAt).getTime() <= ROTATION_GRACE_MS;
  if (!rotatedRecently || stored.tokenHash !== hashRefreshToken(secret)) return 'theft';

  // O substituto foi encerrado pelo "Sair" (ou por uma revogação geral): a
  // sessão acabou de vez — nada a renovar, e nada de suspeito.
  const successor = await repository.findByJti(stored.replacedBy);
  if (!successor || (successor.revokedAt && !successor.replacedBy)) return 'ended';

  return 'concurrent';
}

/**
 * Renova a sessão com **rotação**: o refresh usado é revogado e um novo par é
 * emitido. Reapresentar um refresh já revogado é sinal de token roubado —
 * nesse caso TODAS as sessões do usuário caem —, exceto logo depois de uma
 * rotação legítima (`ROTATION_GRACE_MS`), quando é outra aba renovando junto.
 */
export async function refresh({ cookieValue, userAgent, ip }) {
  const parsed = unpackRefreshToken(cookieValue);
  if (!parsed) throw new ApiError(401, 'Sessão inválida');

  const stored = await repository.findByJti(parsed.jti);
  if (!stored) throw new ApiError(401, 'Sessão inválida');

  // Detecção de reuso: o token existe, mas já havia sido revogado.
  if (stored.revokedAt) {
    const reuse = await classifyReuse(stored, parsed.secret);

    if (reuse === 'ended') throw new ApiError(401, 'Sessão encerrada');
    if (reuse === 'theft') {
      await repository.revokeAllForUser(stored.user);
      logger.warn(
        { userId: String(stored.user), jti: parsed.jti },
        'Refresh token revogado foi reapresentado — todas as sessões do usuário foram encerradas',
      );
      throw new ApiError(401, 'Sessão inválida');
    }

    logger.info(
      { userId: String(stored.user), jti: parsed.jti },
      'Renovação simultânea (outra aba) dentro da tolerância',
    );
  }

  if (stored.expiresAt <= new Date()) throw new ApiError(401, 'Sessão expirada');
  if (stored.tokenHash !== hashRefreshToken(parsed.secret)) {
    throw new ApiError(401, 'Sessão inválida');
  }

  // O usuário pode ter sido desativado depois do login.
  const user = await userRepository.findById(stored.user);
  if (!user || !user.active) throw new ApiError(401, 'Sessão inválida');

  const { jti, accessToken, refreshCookie } = await issueSession({ user, userAgent, ip });
  // Na renovação simultânea, o token usado já estava marcado como trocado.
  if (!stored.revokedAt) await repository.markRotated(parsed.jti, jti);

  return { user: serializeUser(user), accessToken, refreshCookie };
}

/**
 * Consulta, **sem renovar**, se o cookie de refresh ainda vale — para o site
 * público mostrar os atalhos da equipe. Não emite token, não rotaciona e não
 * dispara a detecção de reuso: abrir várias páginas do site em abas ao mesmo
 * tempo não pode derrubar a sessão, e o acesso de fato continua exigindo o
 * refresh do painel.
 *
 * @returns {Promise<{ name: string, role: string } | null>} `null` sem sessão
 */
export async function peekSession(cookieValue) {
  const parsed = unpackRefreshToken(cookieValue);
  if (!parsed) return null;

  const stored = await repository.findByJti(parsed.jti);
  if (!stored || stored.revokedAt || stored.expiresAt <= new Date()) return null;
  if (stored.tokenHash !== hashRefreshToken(parsed.secret)) return null;

  const user = await userRepository.findById(stored.user);
  if (!user || !user.active) return null;

  // Só o que a faixa do site mostra: nada de e-mail ou id.
  return { name: user.name, role: user.role };
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
    jti,
    accessToken: signAccessToken({ id: user._id, role: user.role ?? USER_ROLE.ADMIN }),
    refreshCookie: packRefreshToken({ jti, secret }),
  };
}
