import { describe, expect, it } from 'vitest';

import { periodoParaApi } from './periodo.js';

describe('periodoParaApi', () => {
  it('cobre o dia inteiro no fuso local', () => {
    const { de, ate } = periodoParaApi('2026-09-25', '2026-09-25');

    expect(new Date(de).getHours()).toBe(0);
    expect(new Date(de).getDate()).toBe(25);
    expect(new Date(ate).getHours()).toBe(23);
    expect(new Date(ate).getMinutes()).toBe(59);
    expect(new Date(ate).getDate()).toBe(25);
  });

  it('manda só o que foi preenchido', () => {
    expect(periodoParaApi('', '')).toEqual({});
    expect(Object.keys(periodoParaApi('2026-09-01', ''))).toEqual(['de']);
  });
});
