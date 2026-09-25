import { LEAD_TYPE } from '@motorshop/shared';

import { toCents, toReais } from '../../utils/money.js';

/**
 * Campos em dinheiro dentro de `data`, por tipo. O banco guarda centavos e a
 * API fala reais (D-04) — inclusive aqui, onde `data` é livre no schema.
 */
const MONEY_FIELDS = {
  [LEAD_TYPE.SELL_MOTO]: ['expectedPrice'],
  [LEAD_TYPE.FINANCING]: ['vehiclePrice', 'downPayment'],
};

function convertMoney(type, data, convert) {
  if (!data) return null;
  const result = { ...data };
  for (const field of MONEY_FIELDS[type] ?? []) {
    if (result[field] != null) result[field] = convert(result[field]);
  }
  return result;
}

export const dataToStorage = (type, data) => convertMoney(type, data, toCents);

function serializeMotoRef(moto) {
  if (!moto || typeof moto !== 'object' || !moto._id) return moto ? { id: String(moto) } : null;

  return {
    id: String(moto._id),
    slug: moto.slug,
    model: moto.model,
    version: moto.version ?? null,
    year: moto.year,
    status: moto.status,
    brand: moto.brand?.name ? { name: moto.brand.name, slug: moto.brand.slug } : null,
  };
}

/** Forma completa, só para o painel (rotas autenticadas). */
export function serializeLead(doc) {
  if (!doc) return null;

  const { _id, __v, moto, data, notes, ...rest } = doc;

  return {
    id: String(_id),
    ...rest,
    moto: serializeMotoRef(moto),
    data: convertMoney(doc.type, data, toReais),
    notes: (notes ?? []).map(({ author, ...note }) => ({
      ...note,
      author: author ? String(author) : null,
    })),
  };
}

/**
 * Resposta pública da criação: só a confirmação. Devolver o lead inteiro
 * ecoaria telefone e e-mail numa resposta que qualquer extensão do navegador
 * ou proxy no caminho pode registrar.
 */
export function serializeCreated(doc) {
  return { id: String(doc._id ?? doc.id), type: doc.type, createdAt: doc.createdAt };
}
