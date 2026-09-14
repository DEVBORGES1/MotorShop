import { PAGINATION } from '@motorshop/shared';

/**
 * Traduz page/limit em skip/limit, aplicando o teto do servidor.
 * O cliente não decide o tamanho máximo da página — pedir 10.000 itens seria
 * uma negação de serviço barata.
 *
 * @param {{ page?: number, limit?: number }} query
 */
export function buildPagination({
  page = PAGINATION.DEFAULT_PAGE,
  limit = PAGINATION.DEFAULT_LIMIT,
} = {}) {
  const safeLimit = Math.min(Math.max(1, limit), PAGINATION.MAX_LIMIT);
  const safePage = Math.max(1, page);

  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
}

/**
 * Monta o objeto `meta` do envelope de resposta.
 * @param {{ page: number, limit: number, total: number }} params
 */
export function buildMeta({ page, limit, total }) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}
