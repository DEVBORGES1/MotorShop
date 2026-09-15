import { describe, expect, it } from 'vitest';

import {
  contarFiltrosAtivos,
  descreverFiltros,
  escreverParams,
  FILTROS_VAZIOS,
  lerFiltros,
  paramsDaApi,
} from './catalogo.js';

describe('lerFiltros', () => {
  it('lê filtros simples, listas, ordenação e página', () => {
    const filtros = lerFiltros('q=honda&marca=honda,yamaha&precoMax=25000&sort=preco_asc&page=3');

    expect(filtros).toMatchObject({
      q: 'honda',
      marca: ['honda', 'yamaha'],
      precoMax: '25000',
      sort: 'preco_asc',
      page: 3,
    });
  });

  it('devolve os padrões para URL sem parâmetro', () => {
    expect(lerFiltros('')).toEqual(FILTROS_VAZIOS);
  });

  it('ignora ordenação e página inválidas em vez de quebrar', () => {
    // A URL é digitável e compartilhável: ninguém deve conseguir derrubar a
    // página do estoque colando ?sort=DROP.
    const filtros = lerFiltros('sort=preco_qualquer&page=abc');

    expect(filtros.sort).toBe('recentes');
    expect(filtros.page).toBe(1);
  });

  it('descarta itens vazios de uma lista mal formada', () => {
    expect(lerFiltros('marca=honda,,%20,yamaha').marca).toEqual(['honda', 'yamaha']);
  });
});

describe('escreverParams', () => {
  it('escreve só o que foi escolhido', () => {
    const params = escreverParams({ ...FILTROS_VAZIOS, marca: ['honda'], precoMax: '25000' });

    expect(params.toString()).toBe('precoMax=25000&marca=honda');
  });

  it('omite a ordenação padrão e a primeira página', () => {
    // Sem isto, clicar em qualquer filtro sujaria a URL com ?sort=recentes&page=1.
    expect(escreverParams(FILTROS_VAZIOS).toString()).toBe('');
  });

  it('é o inverso de lerFiltros', () => {
    const url = 'q=cb+500&marca=honda,yamaha&precoMin=10000&cambio=MANUAL&sort=km_asc&page=2';

    // Comparado por conteúdo, não por texto: a ordem dos parâmetros na URL não
    // é significativa, e fixá-la travaria a implementação sem ganho nenhum.
    const ordenado = (params) => [...new URLSearchParams(params)].sort().flat().join('|');

    expect(ordenado(escreverParams(lerFiltros(url)))).toBe(ordenado(url));
  });
});

describe('paramsDaApi', () => {
  it('sempre envia paginação, mesmo na primeira página', () => {
    // O servidor pagina: uma requisição sem limite traria o estoque inteiro.
    expect(paramsDaApi(FILTROS_VAZIOS)).toEqual({ sort: 'recentes', page: 1, limit: 12 });
  });

  it('segura a busca de uma letra só, que a API recusaria com 422', () => {
    expect(paramsDaApi({ ...FILTROS_VAZIOS, q: 'h' }).q).toBeUndefined();
    expect(paramsDaApi({ ...FILTROS_VAZIOS, q: 'ho' }).q).toBe('ho');
  });

  it('mantém as listas como string separada por vírgula', () => {
    const params = paramsDaApi({ ...FILTROS_VAZIOS, marca: ['honda', 'yamaha'] });

    expect(params.marca).toBe('honda,yamaha');
  });
});

describe('contarFiltrosAtivos', () => {
  it('conta cada valor de lista separadamente e ignora a ordenação', () => {
    const filtros = { ...FILTROS_VAZIOS, marca: ['honda', 'yamaha'], precoMax: '25000' };

    expect(contarFiltrosAtivos({ ...filtros, sort: 'preco_asc', page: 4 })).toBe(3);
    expect(contarFiltrosAtivos(FILTROS_VAZIOS)).toBe(0);
  });
});

describe('descreverFiltros', () => {
  const faixas = { brands: [{ slug: 'honda', name: 'Honda', count: 12 }] };

  it('nomeia a marca pelo cadastro, não pelo slug da URL', () => {
    const chips = descreverFiltros({ ...FILTROS_VAZIOS, marca: ['honda'] }, faixas);

    expect(chips).toEqual([{ id: 'marca:honda', rotulo: 'Honda', limpar: { marca: [] } }]);
  });

  it('cai no slug quando a marca não está nas faixas', () => {
    const chips = descreverFiltros({ ...FILTROS_VAZIOS, marca: ['ducati'] }, faixas);

    expect(chips[0].rotulo).toBe('ducati');
  });

  it('remove um item da lista sem levar os outros junto', () => {
    const chips = descreverFiltros({ ...FILTROS_VAZIOS, marca: ['honda', 'yamaha'] }, faixas);

    expect(chips[1].limpar).toEqual({ marca: ['honda'] });
  });

  it('descreve faixas com os rotuladores recebidos', () => {
    const chips = descreverFiltros({ ...FILTROS_VAZIOS, precoMax: '25000' }, faixas, {
      preco: (v) => `R$ ${v}`,
    });

    expect(chips).toEqual([{ id: 'precoMax', rotulo: 'até R$ 25000', limpar: { precoMax: '' } }]);
  });

  it('não descreve nada sem filtro aplicado', () => {
    expect(descreverFiltros(FILTROS_VAZIOS, faixas)).toEqual([]);
  });
});
