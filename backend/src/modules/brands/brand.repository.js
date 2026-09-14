import { Brand } from './brand.model.js';

/**
 * Única camada que conversa com o Mongoose para marcas.
 *
 * Concentrar as queries aqui é o que tornará a futura introdução de `storeId`
 * (multi-loja, ARCHITECTURE §14.3) uma alteração localizada em vez de uma
 * varredura por todo o código.
 */

/** Campos expostos publicamente — allowlist, nunca o documento cru. */
const PUBLIC_FIELDS = 'name slug logo';

export function findPublic() {
  return Brand.find({ active: true }, PUBLIC_FIELDS).sort({ name: 1 }).lean();
}

export function findAll() {
  return Brand.find().sort({ name: 1 }).lean();
}

export function findById(id) {
  return Brand.findById(id).lean();
}

export function findBySlug(slug) {
  return Brand.findOne({ slug }).lean();
}

export function existsWithSlug(slug) {
  return Brand.exists({ slug }).then(Boolean);
}

export function create(data) {
  return Brand.create(data).then((doc) => doc.toObject());
}

export function updateById(id, data) {
  return Brand.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
}

export function deleteById(id) {
  return Brand.findByIdAndDelete(id).lean();
}
