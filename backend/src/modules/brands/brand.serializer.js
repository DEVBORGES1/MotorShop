/**
 * Converte o documento de marca na forma exposta pela API.
 *
 * A convenção da API é `id` (string); `_id` e `__v` são detalhe do MongoDB e
 * nunca saem. Manter isso em um único lugar evita que um endpoint devolva
 * `_id` e outro `id` — inconsistência que o cliente paga.
 */
export function serializeBrand(brand) {
  if (!brand) return null;
  if (!brand._id) return brand; // ObjectId não populado

  const { _id, __v, ...rest } = brand;
  return { id: String(_id), ...rest };
}

export const serializeBrandList = (brands) => brands.map(serializeBrand);
