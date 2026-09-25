/**
 * Rotas do site público, do ponto de vista de SEO: qual página é, se existe,
 * e se deve ser indexada. Espelha `frontend/src/routes/index.jsx`.
 */

const STATIC_PAGES = {
  '/': 'home',
  '/estoque': 'estoque',
  '/financiamento': 'financiamento',
  '/venda-sua-moto': 'venda-sua-moto',
  '/sobre': 'sobre',
  '/contato': 'contato',
  '/privacidade': 'privacidade',
};

/** Páginas de módulo: só existem se a loja ligou o módulo. */
export const PAGE_FEATURE = {
  financiamento: 'financingEnabled',
  'venda-sua-moto': 'sellMotoEnabled',
};

/**
 * @param {string} pathname  sem query string
 * @param {URLSearchParams} query
 * @returns {{ page: string, slug?: string, filtered?: boolean }}
 */
export function resolveRoute(pathname, query) {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;

  if (path === '/admin' || path.startsWith('/admin/')) return { page: 'admin' };

  const moto = path.match(/^\/motos\/([a-z0-9-]{1,140})$/);
  if (moto) return { page: 'moto', slug: moto[1] };

  const page = STATIC_PAGES[path];
  if (!page) return { page: 'not-found' };

  // Catálogo filtrado: milhares de combinações quase iguais competiriam entre
  // si no índice. Ficam fora (`noindex`), mas os links seguem rastreáveis.
  return { page, filtered: page === 'estoque' && [...query.keys()].length > 0 };
}
