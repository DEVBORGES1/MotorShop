import mongoose from 'mongoose';

/**
 * Sessão administrativa persistida.
 *
 * Existe para que uma sessão possa ser **revogada de verdade** — algo que um
 * JWT puro não permite. Guarda o *hash* do token, nunca o token: vazar esta
 * coleção não entrega nenhuma sessão.
 */
const refreshTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    jti: { type: String, required: true },
    tokenHash: { type: String, required: true },

    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },

    // Auditoria: ajudam a reconhecer a sessão em caso de incidente.
    userAgent: { type: String, default: null, maxlength: 300 },
    ip: { type: String, default: null, maxlength: 60 },
  },
  { timestamps: true },
);

refreshTokenSchema.index({ jti: 1 }, { unique: true });
refreshTokenSchema.index({ user: 1 });

// Índice TTL: o MongoDB apaga sessões expiradas sozinho, sem job de limpeza.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
