import { MOTO_STATUS } from '@motorshop/shared';

import { serializeBrand } from '../brands/brand.serializer.js';
import { toReais } from '../../utils/money.js';

/**
 * Converte o documento do banco na forma exposta pela API.
 *
 * Duas responsabilidades:
 * 1. `_id` → `id` (a API nunca expõe `_id` nem `__v`)
 * 2. centavos → reais (decisão D-04: o banco guarda centavos, a API fala reais)
 */
export function serializeMoto(doc) {
  if (!doc) return null;

  const { _id, __v, brand, price, previousPrice, ...rest } = doc;

  return {
    id: String(_id),
    ...rest,
    brand: serializeBrand(brand),
    price: toReais(price),
    previousPrice: previousPrice == null ? null : toReais(previousPrice),
  };
}

export const serializeMotoList = (docs) => docs.map(serializeMoto);

/**
 * Detalhe público de uma moto.
 *
 * Moto vendida continua acessível pela URL (decisão A: preserva o SEO e os
 * links já compartilhados), mas **sem preço**: o valor de venda é informação
 * da negociação, não vitrine. O preço sai daqui, na API, e não só da tela —
 * esconder no frontend deixaria o número a um "ver código-fonte" de distância.
 */
export function serializePublicMotoDetail(doc) {
  const moto = serializeMoto(doc);
  if (moto?.status !== MOTO_STATUS.SOLD) return moto;

  return { ...moto, price: null, previousPrice: null, onSale: false };
}
