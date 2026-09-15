import { MOTO_SORT, PAGINATION, values } from '@motorshop/shared';

/**
 * Tradução entre os filtros do catálogo e a URL.
 *
 * A URL é a fonte da verdade dos filtros (critério da FASE 4): o estado vive
 * em `?marca=honda&precoMax=25000`, não em `useState`. É o que faz o link ser
 * compartilhável, o recarregar preservar a busca e voltar/avançar do navegador
 * funcionarem sem código extra.
 *
 * As duas funções abaixo são inversas e simétricas; os nomes dos parâmetros
 * são os mesmos que a API aceita, para não existir um segundo vocabulário.
 */

/** Filtros de valor único. */
const SIMPLES = [
  'q',
  'precoMin',
  'precoMax',
  'anoMin',
  'anoMax',
  'kmMin',
  'kmMax',
  'ccMin',
  'ccMax',
];

/** Filtros que aceitam vários valores, enviados como lista separada por vírgula. */
const MULTIPLOS = ['marca', 'combustivel', 'cambio'];

const ORDENACOES = values(MOTO_SORT);

export const FILTROS_VAZIOS = Object.freeze({
  ...Object.fromEntries(SIMPLES.map((chave) => [chave, ''])),
  ...Object.fromEntries(MULTIPLOS.map((chave) => [chave, []])),
  sort: MOTO_SORT.RECENTES,
  page: PAGINATION.DEFAULT_PAGE,
});

/** URL → filtros. Valor inválido é ignorado em vez de quebrar a página. */
export function lerFiltros(searchParams) {
  const params = new URLSearchParams(searchParams);
  const filtros = { ...FILTROS_VAZIOS };

  for (const chave of SIMPLES) {
    filtros[chave] = params.get(chave)?.trim() ?? '';
  }

  for (const chave of MULTIPLOS) {
    const bruto = params.get(chave);
    filtros[chave] = bruto
      ? bruto
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : [];
  }

  const sort = params.get('sort');
  if (ORDENACOES.includes(sort)) filtros.sort = sort;

  const page = Number.parseInt(params.get('page') ?? '', 10);
  if (Number.isInteger(page) && page > 0) filtros.page = page;

  return filtros;
}

/**
 * Filtros → URL. Valor vazio e padrão não entram: a URL mostra só o que o
 * visitante realmente escolheu, e `/estoque` continua sendo `/estoque`.
 */
export function escreverParams(filtros) {
  const params = new URLSearchParams();

  for (const chave of SIMPLES) {
    const valor = String(filtros[chave] ?? '').trim();
    if (valor) params.set(chave, valor);
  }

  for (const chave of MULTIPLOS) {
    const lista = filtros[chave] ?? [];
    if (lista.length) params.set(chave, lista.join(','));
  }

  if (filtros.sort && filtros.sort !== MOTO_SORT.RECENTES) params.set('sort', filtros.sort);
  if (filtros.page > 1) params.set('page', String(filtros.page));

  return params;
}

/**
 * Filtros → parâmetros da requisição.
 *
 * Difere da URL em dois pontos: `page` e `limit` vão sempre (o servidor pagina,
 * o cliente nunca recebe o estoque inteiro) e as listas viram string única,
 * como a API espera.
 */
export function paramsDaApi(filtros, { limit = PAGINATION.DEFAULT_LIMIT } = {}) {
  const params = Object.fromEntries(escreverParams(filtros));

  // A API exige dois caracteres na busca textual e devolve 422 abaixo disso.
  // A primeira letra digitada não pode virar erro na tela.
  if (params.q && params.q.length < 2) delete params.q;

  return { ...params, sort: filtros.sort, page: filtros.page, limit };
}

/** Quantos filtros o visitante aplicou — a ordenação não conta como filtro. */
export function contarFiltrosAtivos(filtros) {
  const simples = SIMPLES.filter((chave) => String(filtros[chave] ?? '').trim()).length;
  const multiplos = MULTIPLOS.reduce((total, chave) => total + (filtros[chave]?.length ?? 0), 0);

  return simples + multiplos;
}

/**
 * Descreve os filtros aplicados, um a um, para os chips de remoção.
 *
 * Cada item sabe se remover (`limpar`), porque remover "Honda" de uma lista de
 * marcas e remover "até R$ 25.000" são operações diferentes — e quem desenha o
 * chip não deveria precisar saber qual é qual.
 *
 * @param {object} filtros
 * @param {object} [faixas] resposta de `GET /api/filtros`, para nomear marcas
 * @returns {Array<{id: string, rotulo: string, limpar: object}>}
 */
export function descreverFiltros(filtros, faixas, rotuladores = {}) {
  const { preco = (v) => v, km = (v) => v, marca = (v) => v, enumerado = (v) => v } = rotuladores;

  const nomeDaMarca = (slug) =>
    faixas?.brands?.find((item) => item.slug === slug)?.name ?? marca(slug);

  const chips = [];
  const push = (id, rotulo, limpar) => chips.push({ id, rotulo, limpar });

  if (filtros.q) push('q', `"${filtros.q}"`, { q: '' });

  filtros.marca.forEach((slug) =>
    push(`marca:${slug}`, nomeDaMarca(slug), {
      marca: filtros.marca.filter((item) => item !== slug),
    }),
  );

  if (filtros.precoMin)
    push('precoMin', `a partir de ${preco(filtros.precoMin)}`, { precoMin: '' });
  if (filtros.precoMax) push('precoMax', `até ${preco(filtros.precoMax)}`, { precoMax: '' });
  if (filtros.anoMin) push('anoMin', `de ${filtros.anoMin}`, { anoMin: '' });
  if (filtros.anoMax) push('anoMax', `até ${filtros.anoMax}`, { anoMax: '' });
  if (filtros.kmMin) push('kmMin', `a partir de ${km(filtros.kmMin)}`, { kmMin: '' });
  if (filtros.kmMax) push('kmMax', `até ${km(filtros.kmMax)}`, { kmMax: '' });
  if (filtros.ccMin) push('ccMin', `de ${filtros.ccMin}cc`, { ccMin: '' });
  if (filtros.ccMax) push('ccMax', `até ${filtros.ccMax}cc`, { ccMax: '' });

  filtros.cambio.forEach((valor) =>
    push(`cambio:${valor}`, enumerado('cambio', valor), {
      cambio: filtros.cambio.filter((item) => item !== valor),
    }),
  );

  filtros.combustivel.forEach((valor) =>
    push(`combustivel:${valor}`, enumerado('combustivel', valor), {
      combustivel: filtros.combustivel.filter((item) => item !== valor),
    }),
  );

  return chips;
}
