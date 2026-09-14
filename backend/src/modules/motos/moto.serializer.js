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
