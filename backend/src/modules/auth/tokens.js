import { createHash, randomBytes } from 'node:crypto';

import jwt from 'jsonwebtoken';

import { env } from '../../config/env.js';

/**
 * Emissão e verificação dos dois tokens da sessão administrativa.
 *
 * - **Access token**: JWT curto (15 min), guardado apenas em memória no cliente.
 * - **Refresh token**: opaco e aleatório (7 dias), em cookie httpOnly.
 *
 * O refresh é opaco de propósito: um JWT não pode ser revogado, e sessão
 * administrativa precisa ser revogável. O valor vive no cookie; o banco guarda
 * apenas o **hash** dele, então vazar a coleção não entrega sessões.
 */

const ACCESS_TTL = '15m';
export const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Gera o access token.
 *
 * O payload carrega apenas `sub` e `role`. Nada de e-mail ou nome: o JWT é
 * assinado, não criptografado — qualquer pessoa lê o conteúdo.
 */
export function signAccessToken({ id, role }) {
  return jwt.sign({ role }, env.JWT_SECRET, {
    subject: String(id),
    expiresIn: ACCESS_TTL,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  });
}

/**
 * @returns {{ sub: string, role: string } | null} `null` se inválido ou expirado.
 */
export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, env.JWT_SECRET, {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    });
  } catch {
    return null;
  }
}

/** Gera o refresh token opaco e o identificador da sessão. */
export function generateRefreshToken() {
  return { jti: randomBytes(16).toString('hex'), secret: randomBytes(32).toString('base64url') };
}

/** O banco armazena o hash, nunca o token. */
export function hashRefreshToken(secret) {
  return createHash('sha256').update(secret).digest('hex');
}

/** O cookie carrega jti e segredo juntos: o jti localiza a sessão sem varrer a coleção. */
export const packRefreshToken = ({ jti, secret }) => `${jti}.${secret}`;

export function unpackRefreshToken(value) {
  const [jti, secret] = String(value ?? '').split('.');
  return jti && secret ? { jti, secret } : null;
}

export const REFRESH_COOKIE = 'motorshop_refresh';

/**
 * Opções do cookie de refresh.
 *
 * `httpOnly` impede que um XSS leia o token — o motivo de não usar
 * localStorage. `Path` restrito faz o cookie só ser enviado às rotas de auth.
 */
export function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: REFRESH_TTL_MS,
  };
}
