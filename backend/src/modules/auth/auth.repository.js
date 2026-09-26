import { RefreshToken } from './refreshToken.model.js';

/** Única camada que fala Mongoose para sessões. */

export function create(data) {
  return RefreshToken.create(data);
}

export function findByJti(jti) {
  return RefreshToken.findOne({ jti }).lean();
}

export function revokeByJti(jti) {
  return RefreshToken.updateOne({ jti, revokedAt: null }, { revokedAt: new Date() });
}

/** Rotação: o token usado é revogado e passa a apontar para o substituto. */
export function markRotated(jti, replacedBy) {
  return RefreshToken.updateOne({ jti, revokedAt: null }, { revokedAt: new Date(), replacedBy });
}

/** Usado na detecção de reuso e ao desativar um usuário. */
export function revokeAllForUser(userId) {
  return RefreshToken.updateMany({ user: userId, revokedAt: null }, { revokedAt: new Date() });
}
