import { LEAD_STATUS, LEAD_TYPE, values } from '@motorshop/shared';
import mongoose from 'mongoose';

/**
 * Lead — coleção única com discriminador `type` (decisão D-05).
 *
 * `data` é `Mixed` de propósito: o formato de cada tipo é garantido pela união
 * discriminada do Zod na entrada (`@motorshop/shared`), não aqui. Valores em
 * dinheiro dentro de `data` ficam em CENTAVOS, como no resto do banco (D-04).
 *
 * Contém dado pessoal (nome, telefone, e-mail): acesso só autenticado,
 * exclusão só por SUPER_ADMIN, nunca em log (ARCHITECTURE §8.7).
 */

const noteSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // Cópia do nome: a anotação continua legível se o usuário for desativado.
    authorName: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const leadSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, enum: values(LEAD_TYPE) },

    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true }, // E.164: +5549999998888
    email: { type: String, trim: true, lowercase: true, default: null },
    message: { type: String, trim: true, default: null },

    moto: { type: mongoose.Schema.Types.ObjectId, ref: 'Moto', default: null },
    data: { type: mongoose.Schema.Types.Mixed, default: null },

    status: { type: String, enum: values(LEAD_STATUS), default: LEAD_STATUS.NEW },

    source: {
      page: { type: String, default: null },
      referrer: { type: String, default: null },
      utm: {
        source: String,
        medium: String,
        campaign: String,
        term: String,
        content: String,
      },
    },

    notes: { type: [noteSchema], default: [] },

    // Registro da base legal (LGPD): o que foi aceito, quando e em qual versão.
    consent: {
      accepted: { type: Boolean, required: true },
      at: { type: Date, required: true },
      textVersion: { type: String, required: true },
    },
  },
  { timestamps: true },
);

// A tela de leads lista do mais recente para o mais antigo, com ou sem filtro.
leadSchema.index({ createdAt: -1 });
leadSchema.index({ status: 1, createdAt: -1 });
leadSchema.index({ type: 1, createdAt: -1 });
// Detecção de envio repetido (clique duplo, reenvio da mesma pessoa).
leadSchema.index({ phone: 1, type: 1, createdAt: -1 });

export const Lead = mongoose.model('Lead', leadSchema);
