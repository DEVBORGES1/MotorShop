import { api } from './api.js';

/**
 * Chamadas do site público. Única camada do catálogo que conhece as rotas.
 *
 * `list` devolve o envelope inteiro porque a paginação vem em `meta`; as
 * demais devolvem só `data`.
 */

export const motos = {
  list: (params) => api.get('/motos', { params }),
  getBySlug: (slug) => api.get(`/motos/slug/${slug}`).then((e) => e.data),
  similares: (slug) => api.get(`/motos/slug/${slug}/similares`).then((e) => e.data),
};

export const marcas = {
  list: () => api.get('/marcas').then((e) => e.data),
};

export const store = {
  get: () => api.get('/store').then((e) => e.data),
};

/** Faixas reais de preço, ano, km e cilindrada do estoque, para os filtros. */
export const filtros = {
  get: (params) => api.get('/filtros', { params }).then((e) => e.data),
};

/** Formulários de contato, interesse e venda. Devolve só a confirmação. */
export const leads = {
  create: (data) => api.post('/leads', data).then((e) => e.data),
};
