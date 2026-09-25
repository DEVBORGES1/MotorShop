import { MOTO_SORT } from '@motorshop/shared';

import { Moto } from './moto.model.js';

/**
 * Única camada que fala Mongoose para motos.
 *
 * Duas responsabilidades de segurança vivem aqui:
 * 1. **Projeção por allowlist** — consultas públicas listam os campos
 *    permitidos. Um campo novo no schema NÃO se torna público sozinho.
 * 2. **Construção do filtro** — nenhum valor vindo do cliente vira chave de
 *    query; tudo passa por mapeamento explícito.
 */

/**
 * Campos que o catálogo público pode devolver. `licensePlate` jamais entra.
 *
 * Exportados de propósito: a projeção pública é um **controle de segurança**
 * (ARCHITECTURE §8.4, risco R-14), e um teste a verifica diretamente. Um campo
 * novo no schema não vira público sozinho — precisa ser acrescentado aqui.
 */
export const PUBLIC_LIST_FIELDS =
  'brand model version year mileage price previousPrice engineCapacity fuel transmission color images mainImageId featured onSale status slug createdAt';

export const PUBLIC_DETAIL_FIELDS = `${PUBLIC_LIST_FIELDS} description features updatedAt`;

/** Ordenações permitidas. O valor do cliente é uma CHAVE, nunca o campo. */
export const SORT_MAP = Object.freeze({
  [MOTO_SORT.RECENTES]: { featured: -1, createdAt: -1 },
  [MOTO_SORT.PRECO_ASC]: { price: 1 },
  [MOTO_SORT.PRECO_DESC]: { price: -1 },
  [MOTO_SORT.ANO_DESC]: { year: -1 },
  [MOTO_SORT.ANO_ASC]: { year: 1 },
  [MOTO_SORT.KM_ASC]: { mileage: 1 },
  [MOTO_SORT.KM_DESC]: { mileage: -1 },
});

/**
 * Monta o filtro do MongoDB a partir de parâmetros já validados.
 *
 * `statuses` é imposto pelo serviço, **nunca** vem do cliente: é o que impede
 * que alguém liste o estoque inativo passando `?status=INACTIVE`.
 *
 * @param {object} params
 * @returns {object} filtro Mongo
 */
export function buildFilter({
  statuses,
  brandIds,
  q,
  priceMin,
  priceMax,
  yearMin,
  yearMax,
  mileageMin,
  mileageMax,
  engineMin,
  engineMax,
  fuel,
  transmission,
  featured,
  onSale,
} = {}) {
  const filter = { status: { $in: statuses } };

  if (brandIds?.length) filter.brand = { $in: brandIds };
  if (q) filter.$text = { $search: q };

  applyRange(filter, 'price', priceMin, priceMax);
  applyRange(filter, 'year', yearMin, yearMax);
  applyRange(filter, 'mileage', mileageMin, mileageMax);
  applyRange(filter, 'engineCapacity', engineMin, engineMax);

  if (fuel?.length) filter.fuel = { $in: fuel };
  if (transmission?.length) filter.transmission = { $in: transmission };
  if (featured !== undefined) filter.featured = featured;
  if (onSale !== undefined) filter.onSale = onSale;

  return filter;
}

function applyRange(filter, field, min, max) {
  if (min === undefined && max === undefined) return;
  filter[field] = {};
  if (min !== undefined) filter[field].$gte = min;
  if (max !== undefined) filter[field].$lte = max;
}

export function buildSort(sortKey) {
  return SORT_MAP[sortKey] ?? SORT_MAP[MOTO_SORT.RECENTES];
}

/**
 * Lista paginada com projeção pública.
 * `find` e `countDocuments` correm em paralelo — em série, dobrariam a latência.
 */
export async function findPaginated({ filter, sort, skip, limit }) {
  const [items, total] = await Promise.all([
    Moto.find(filter, PUBLIC_LIST_FIELDS)
      .populate('brand', 'name slug')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Moto.countDocuments(filter),
  ]);

  return { items, total };
}

export function findBySlug(slug, statuses) {
  return Moto.findOne({ slug, status: { $in: statuses } }, PUBLIC_DETAIL_FIELDS)
    .populate('brand', 'name slug logo')
    .lean();
}

/** A moto existe e está visível ao público? Usado para vincular um lead a ela. */
export function existsPublic(id, statuses) {
  return Moto.exists({ _id: id, status: { $in: statuses } }).then(Boolean);
}

/**
 * Motos relacionadas: mesma marca ou faixa de preço próxima, excluindo a
 * própria. Sem ordenação aleatória — `$sample` impediria o uso de índice.
 */
export function findSimilar({ id, brandId, price, statuses, limit = 4 }) {
  return Moto.find(
    {
      _id: { $ne: id },
      status: { $in: statuses },
      $or: [{ brand: brandId }, { price: { $gte: price * 0.7, $lte: price * 1.3 } }],
    },
    PUBLIC_LIST_FIELDS,
  )
    .populate('brand', 'name slug')
    .sort({ featured: -1, createdAt: -1 })
    .limit(limit)
    .lean();
}

/**
 * Faixas reais do estoque para montar os filtros do catálogo.
 *
 * Uma única agregação com `$facet`. Sem isso, a tela de filtros precisaria
 * baixar todas as motos só para saber os limites dos sliders — exatamente o
 * que o projeto proíbe.
 */
export function aggregateFilterRanges(statuses) {
  return Moto.aggregate([
    { $match: { status: { $in: statuses } } },
    {
      $facet: {
        price: [{ $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } }],
        year: [{ $group: { _id: null, min: { $min: '$year' }, max: { $max: '$year' } } }],
        mileage: [{ $group: { _id: null, min: { $min: '$mileage' }, max: { $max: '$mileage' } } }],
        engineCapacity: [
          {
            $group: {
              _id: null,
              min: { $min: '$engineCapacity' },
              max: { $max: '$engineCapacity' },
            },
          },
        ],
        brands: [
          { $group: { _id: '$brand', count: { $sum: 1 } } },
          { $lookup: { from: 'brands', localField: '_id', foreignField: '_id', as: 'brand' } },
          { $unwind: '$brand' },
          {
            $project: {
              _id: 0,
              id: '$brand._id',
              name: '$brand.name',
              slug: '$brand.slug',
              count: 1,
            },
          },
          { $sort: { name: 1 } },
        ],
        fuel: [{ $group: { _id: '$fuel', count: { $sum: 1 } } }, { $sort: { _id: 1 } }],
        transmission: [
          { $group: { _id: '$transmission', count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ],
        total: [{ $count: 'value' }],
      },
    },
  ]);
}

// --- Operações administrativas ---------------------------------------------
// Sem projeção pública: o admin precisa do documento completo, `licensePlate`
// incluída (daí o `+licensePlate`, que vence o `select: false` do schema).

export function findAllAdmin({ filter, sort, skip, limit }) {
  return Promise.all([
    Moto.find(filter)
      .select('+licensePlate')
      .populate('brand', 'name slug')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Moto.countDocuments(filter),
  ]).then(([items, total]) => ({ items, total }));
}

export function findByIdAdmin(id) {
  return Moto.findById(id).select('+licensePlate').populate('brand', 'name slug').lean();
}

export function existsWithSlug(slug) {
  return Moto.exists({ slug }).then(Boolean);
}

export function countByBrand(brandId) {
  return Moto.countDocuments({ brand: brandId });
}

export function create(data) {
  return Moto.create(data).then((doc) => doc.toObject());
}

export function updateById(id, data) {
  return Moto.findByIdAndUpdate(id, data, { new: true, runValidators: true })
    .select('+licensePlate')
    .populate('brand', 'name slug')
    .lean();
}

// --- Fotos -------------------------------------------------------------------

/**
 * Acrescenta a foto só se a moto ainda tiver vaga. O limite é conferido **na
 * própria escrita** (`images.<limite-1>` não existe), não num `count` antes:
 * dois envios simultâneos com 19 fotos não conseguem ambos passar.
 *
 * @returns {Promise<object|null>} moto atualizada, ou `null` se estava cheia
 */
export function pushImageIfRoom(id, image, maxImages) {
  return Moto.findOneAndUpdate(
    { _id: id, [`images.${maxImages - 1}`]: { $exists: false } },
    { $push: { images: image } },
    { new: true },
  ).lean();
}

/** Define a principal só se ainda não houver uma (primeira foto enviada). */
export function setMainImageIfEmpty(id, imageId) {
  return Moto.updateOne({ _id: id, mainImageId: null }, { $set: { mainImageId: imageId } });
}

/**
 * Substitui a lista inteira (nova ordem) com trava otimista: só grava se o
 * conjunto de fotos ainda for o que o painel viu. Se alguém enviou ou excluiu
 * uma foto no meio tempo, devolve `null` em vez de apagar a mudança do outro.
 */
export function replaceImagesIfUnchanged(id, expectedIds, images, mainImageId) {
  return Moto.findOneAndUpdate(
    { _id: id, images: { $size: expectedIds.length }, 'images.id': { $all: expectedIds } },
    { $set: { images, mainImageId } },
    { new: true },
  )
    .select('+licensePlate')
    .populate('brand', 'name slug')
    .lean();
}

export function updateImageAlt(id, imageId, alt) {
  return Moto.findOneAndUpdate(
    { _id: id, 'images.id': imageId },
    { $set: { 'images.$.alt': alt } },
    { new: true },
  )
    .select('+licensePlate')
    .populate('brand', 'name slug')
    .lean();
}

/** Remove a foto e devolve o documento **anterior** (para achar o publicId). */
export function pullImage(id, imageId) {
  return Moto.findOneAndUpdate(
    { _id: id, 'images.id': imageId },
    { $pull: { images: { id: imageId } } },
    { new: false },
  ).lean();
}

export function setMainImage(id, mainImageId) {
  return Moto.updateOne({ _id: id }, { $set: { mainImageId } });
}

/** Motos do sitemap: só slug e data de alteração, das mais recentes. */
export function findForSitemap(statuses) {
  return Moto.find({ status: { $in: statuses } }, 'slug updatedAt')
    .sort({ updatedAt: -1 })
    .limit(50_000) // teto de URLs de um sitemap (protocolo sitemaps.org)
    .lean();
}
