import { PAGINATION } from '@motorshop/shared';
import { describe, expect, it } from 'vitest';

import { buildMeta, buildPagination } from '../../src/utils/pagination.js';

describe('buildPagination', () => {
  it('aplica os padrões', () => {
    expect(buildPagination()).toEqual({ page: 1, limit: 12, skip: 0 });
  });

  it('calcula o skip corretamente', () => {
    expect(buildPagination({ page: 3, limit: 12 }).skip).toBe(24);
  });

  it('impõe o teto do servidor — o cliente não escolhe o tamanho da página', () => {
    expect(buildPagination({ limit: 10_000 }).limit).toBe(PAGINATION.MAX_LIMIT);
  });

  it('trata página e limite abaixo do mínimo', () => {
    expect(buildPagination({ page: 0, limit: 0 })).toEqual({ page: 1, limit: 1, skip: 0 });
  });
});

describe('buildMeta', () => {
  it('calcula o total de páginas', () => {
    expect(buildMeta({ page: 2, limit: 12, total: 87 })).toEqual({
      page: 2,
      limit: 12,
      total: 87,
      totalPages: 8,
    });
  });

  it('devolve ao menos uma página quando não há resultado', () => {
    expect(buildMeta({ page: 1, limit: 12, total: 0 }).totalPages).toBe(1);
  });
});
