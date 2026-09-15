import { describe, expect, it } from 'vitest';

import { pageItems } from './pagination.js';

describe('pageItems', () => {
  it('lista todas as páginas quando cabem sem corte', () => {
    expect(pageItems(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('corta o meio quando a atual está no começo', () => {
    expect(pageItems(2, 20)).toEqual([1, 2, 3, 'gap', 20]);
  });

  it('corta os dois lados quando a atual está no meio', () => {
    expect(pageItems(10, 20)).toEqual([1, 'gap', 9, 10, 11, 'gap', 20]);
  });

  it('corta o meio quando a atual está no fim', () => {
    expect(pageItems(20, 20)).toEqual([1, 'gap', 19, 20]);
  });

  it('mostra a página em vez de reticências quando o corte seria de uma só', () => {
    // Sem isto sairia [1, 'gap', 3, 4, 5, 'gap', 7]: as reticências ocupariam
    // o mesmo espaço da página 2 e esconderiam para onde ela leva.
    expect(pageItems(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('aceita mais vizinhos', () => {
    expect(pageItems(10, 20, 2)).toEqual([1, 'gap', 8, 9, 10, 11, 12, 'gap', 20]);
  });

  it('prende a página atual dentro do intervalo válido', () => {
    expect(pageItems(99, 3)).toEqual([1, 2, 3]);
    expect(pageItems(0, 3)).toEqual([1, 2, 3]);
  });

  it('devolve vazio sem páginas', () => {
    expect(pageItems(1, 0)).toEqual([]);
    expect(pageItems(1, undefined)).toEqual([]);
  });
});
