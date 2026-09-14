import { MOTO_STATUS, PUBLIC_DETAIL_STATUSES, PUBLIC_LIST_STATUSES } from '@motorshop/shared';

import { ApiError } from '../../utils/ApiError.js';
import { toReais } from '../../utils/money.js';
import { buildMeta, buildPagination } from '../../utils/pagination.js';
import { buildSlug, resolveUniqueSlug } from '../../utils/slug.js';
import * as brandRepository from '../brands/brand.repository.js';
import * as repository from './moto.repository.js';
import { serializeMoto, serializeMotoList } from './moto.serializer.js';

/**
 * Regra de negócio de motos. Não conhece Express nem Mongoose.
 */

/**
 * Catálogo público.
 *
 * O conjunto de status é decidido **aqui, no servidor**. O cliente não tem como
 * pedir motos `INACTIVE`: a lista de status não é parâmetro de query.
 */
export async function listPublic(query) {
  const { page, limit, skip } = buildPagination(query);
  const brandIds = await resolveBrandSlugs(query.marca);

  // Marca inexistente: resultado vazio é a resposta correta, não erro.
  if (query.marca?.length && brandIds.length === 0) {
    return { items: [], meta: buildMeta({ page, limit, total: 0 }) };
  }

  const filter = repository.buildFilter({
    ...toFilterInput(query),
    statuses: PUBLIC_LIST_STATUSES,
    brandIds,
  });
  const { items, total } = await repository.findPaginated({
    filter,
    sort: repository.buildSort(query.sort),
    skip,
    limit,
  });

  return { items: serializeMotoList(items), meta: buildMeta({ page, limit, total }) };
}

export async function getBySlug(slug) {
  const moto = await repository.findBySlug(slug, PUBLIC_DETAIL_STATUSES);
  if (!moto) throw ApiError.notFound('Moto não encontrada');
  return serializeMoto(moto);
}

export async function listSimilar(slug) {
  const moto = await repository.findBySlug(slug, PUBLIC_DETAIL_STATUSES);
  if (!moto) throw ApiError.notFound('Moto não encontrada');

  const similar = await repository.findSimilar({
    id: moto._id,
    brandId: moto.brand?._id ?? moto.brand,
    price: moto.price,
    statuses: PUBLIC_LIST_STATUSES,
  });

  return serializeMotoList(similar);
}

/** Faixas reais do estoque, para montar os filtros sem baixar o catálogo. */
export async function getFilterRanges() {
  const [result] = await repository.aggregateFilterRanges(PUBLIC_LIST_STATUSES);

  const range = (facet, convert = (v) => v) =>
    facet?.[0] ? { min: convert(facet[0].min), max: convert(facet[0].max) } : null;

  return {
    total: result.total?.[0]?.value ?? 0,
    price: range(result.price, toReais),
    year: range(result.year),
    mileage: range(result.mileage),
    engineCapacity: range(result.engineCapacity),
    brands: result.brands.map((b) => ({ ...b, id: String(b.id) })),
    fuel: result.fuel.map((f) => ({ value: f._id, count: f.count })),
    transmission: result.transmission.map((t) => ({ value: t._id, count: t.count })),
  };
}

// --- Administrativo ---------------------------------------------------------

export async function listAdmin(query) {
  const { page, limit, skip } = buildPagination(query);
  const brandIds = await resolveBrandSlugs(query.marca);

  // O admin PODE filtrar por status; sem filtro, vê todos, inclusive INACTIVE.
  const statuses = query.status?.length ? query.status : Object.values(MOTO_STATUS);

  const filter = repository.buildFilter({ ...toFilterInput(query), statuses, brandIds });
  const { items, total } = await repository.findAllAdmin({
    filter,
    sort: repository.buildSort(query.sort),
    skip,
    limit,
  });

  return { items: serializeMotoList(items), meta: buildMeta({ page, limit, total }) };
}

export async function getByIdAdmin(id) {
  const moto = await repository.findByIdAdmin(id);
  if (!moto) throw ApiError.notFound('Moto não encontrada');
  return serializeMoto(moto);
}

export async function create(data) {
  const brand = await requireActiveBrand(data.brand);

  const slug = await resolveUniqueSlug(
    buildSlug([brand.name, data.model, data.version, data.year]),
    repository.existsWithSlug,
  );

  const created = await repository.create({ ...data, slug });
  return getByIdAdmin(created._id);
}

export async function update(id, data) {
  await getByIdAdmin(id); // 404 antes de escrever
  if (data.brand) await requireActiveBrand(data.brand);

  // `slug` é `immutable` no schema; mesmo assim nunca é aceito na entrada
  // (o schema Zod é `.strict()`), então não há caminho para alterá-lo.
  return serializeMoto(await repository.updateById(id, data));
}

export async function changeStatus(id, status) {
  await getByIdAdmin(id);
  return serializeMoto(await repository.updateById(id, { status }));
}

/**
 * "Exclusão" é desativação (decisão D-06): leads antigos referenciam a moto,
 * links já indexados precisam de resposta coerente, e apagar um cadastro com
 * 20 fotos por engano é irreversível.
 */
export async function deactivate(id) {
  await getByIdAdmin(id);
  return serializeMoto(await repository.updateById(id, { status: MOTO_STATUS.INACTIVE }));
}

// --- Apoio ------------------------------------------------------------------

async function requireActiveBrand(brandId) {
  const brand = await brandRepository.findById(brandId);
  if (!brand) throw ApiError.badRequest('Marca informada não existe');
  if (!brand.active) throw ApiError.badRequest(`A marca "${brand.name}" está inativa`);
  return brand;
}

/** Traduz slugs de marca em ids. Aceita uma ou várias (`?marca=honda,yamaha`). */
async function resolveBrandSlugs(slugs) {
  if (!slugs?.length) return [];
  const found = await Promise.all(slugs.map((slug) => brandRepository.findBySlug(slug)));
  return found.filter(Boolean).map((brand) => brand._id);
}

/** Nomes de query (português, da API) → nomes de domínio (inglês). */
function toFilterInput(query) {
  return {
    q: query.q,
    priceMin: query.precoMin,
    priceMax: query.precoMax,
    yearMin: query.anoMin,
    yearMax: query.anoMax,
    mileageMin: query.kmMin,
    mileageMax: query.kmMax,
    engineMin: query.ccMin,
    engineMax: query.ccMax,
    fuel: query.combustivel,
    transmission: query.cambio,
    featured: query.destaque,
    onSale: query.oferta,
  };
}
