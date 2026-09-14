import { MOTO_SORT, MOTO_STATUS, PUBLIC_LIST_STATUSES } from '@motorshop/shared';
import { describe, expect, it } from 'vitest';

import {
  PUBLIC_DETAIL_FIELDS,
  PUBLIC_LIST_FIELDS,
  buildFilter,
  buildSort,
} from '../../src/modules/motos/moto.repository.js';

/** Campos que NUNCA podem aparecer em uma resposta pública. */
const CAMPOS_PRIVADOS = ['licensePlate', 'passwordHash', '__v'];

describe('projeção pública (controle de segurança — R-14)', () => {
  it.each(CAMPOS_PRIVADOS)('não expõe "%s" na listagem', (campo) => {
    expect(PUBLIC_LIST_FIELDS.split(/\s+/)).not.toContain(campo);
  });

  it.each(CAMPOS_PRIVADOS)('não expõe "%s" no detalhe', (campo) => {
    expect(PUBLIC_DETAIL_FIELDS.split(/\s+/)).not.toContain(campo);
  });

  it('é uma allowlist — campo novo no schema não vira público sozinho', () => {
    // Se este teste falhar, alguém acrescentou um campo à projeção pública.
    // Confirme que ele pode mesmo ser exposto antes de atualizar a lista.
    expect(PUBLIC_LIST_FIELDS.split(/\s+/).sort()).toEqual(
      [
        'brand',
        'color',
        'createdAt',
        'engineCapacity',
        'featured',
        'fuel',
        'images',
        'mainImageId',
        'mileage',
        'model',
        'onSale',
        'previousPrice',
        'price',
        'slug',
        'status',
        'transmission',
        'version',
        'year',
      ].sort(),
    );
  });
});

describe('buildFilter', () => {
  it('sempre restringe por status', () => {
    expect(buildFilter({ statuses: PUBLIC_LIST_STATUSES }).status).toEqual({
      $in: [MOTO_STATUS.AVAILABLE, MOTO_STATUS.RESERVED],
    });
  });

  it('monta faixas com $gte e $lte', () => {
    const filter = buildFilter({ statuses: ['AVAILABLE'], priceMin: 1000, priceMax: 5000 });
    expect(filter.price).toEqual({ $gte: 1000, $lte: 5000 });
  });

  it('aceita faixa aberta de um lado só', () => {
    expect(buildFilter({ statuses: ['AVAILABLE'], yearMin: 2020 }).year).toEqual({ $gte: 2020 });
    expect(buildFilter({ statuses: ['AVAILABLE'], mileageMax: 10_000 }).mileage).toEqual({
      $lte: 10_000,
    });
  });

  it('omite completamente os filtros não informados', () => {
    expect(Object.keys(buildFilter({ statuses: ['AVAILABLE'] }))).toEqual(['status']);
  });

  it('usa busca textual indexada em vez de regex montada com entrada do usuário', () => {
    const filter = buildFilter({ statuses: ['AVAILABLE'], q: 'cb 500' });
    expect(filter.$text).toEqual({ $search: 'cb 500' });
    expect(JSON.stringify(filter)).not.toContain('$regex');
  });

  it('não deixa entrada do usuário virar chave do filtro', () => {
    const filter = buildFilter({
      statuses: ['AVAILABLE'],
      // Valores hostis: precisam virar VALOR, nunca operador.
      q: '$where',
      fuel: ['FLEX'],
    });

    const chaves = Object.keys(filter);
    expect(chaves.every((k) => !k.startsWith('$') || k === '$text')).toBe(true);
    expect(chaves).not.toContain('$where');
  });

  it('trata booleanos explicitamente (false não é "não informado")', () => {
    expect(buildFilter({ statuses: ['AVAILABLE'], featured: false }).featured).toBe(false);
    expect(buildFilter({ statuses: ['AVAILABLE'] })).not.toHaveProperty('featured');
  });
});

describe('buildSort — whitelist', () => {
  it.each([
    [MOTO_SORT.PRECO_ASC, { price: 1 }],
    [MOTO_SORT.PRECO_DESC, { price: -1 }],
    [MOTO_SORT.ANO_DESC, { year: -1 }],
    [MOTO_SORT.ANO_ASC, { year: 1 }],
    [MOTO_SORT.KM_ASC, { mileage: 1 }],
    [MOTO_SORT.KM_DESC, { mileage: -1 }],
  ])('mapeia "%s" corretamente', (chave, esperado) => {
    expect(buildSort(chave)).toEqual(esperado);
  });

  it('cai no padrão para chave desconhecida, sem usar o valor recebido', () => {
    const sort = buildSort('price; drop database');
    expect(sort).toEqual({ featured: -1, createdAt: -1 });
    expect(Object.keys(sort)).not.toContain('price; drop database');
  });
});
