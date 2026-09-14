import { describe, expect, it } from 'vitest';

import { toCents, toReais } from '../../src/utils/money.js';

describe('money', () => {
  it('converte reais em centavos inteiros', () => {
    expect(toCents(38900)).toBe(3890000);
    expect(toCents(199.9)).toBe(19990);
    expect(toCents(0.01)).toBe(1);
  });

  it('arredonda em vez de truncar', () => {
    expect(toCents(10.005)).toBe(1001);
    expect(toCents(10.004)).toBe(1000);
  });

  it('evita o erro clássico de ponto flutuante', () => {
    // 19.99 * 100 === 1998.9999999999998 em float
    expect(toCents(19.99)).toBe(1999);
    expect(Number.isInteger(toCents(19.99))).toBe(true);
  });

  it('faz a volta sem perder valor', () => {
    for (const reais of [1, 19.99, 38900, 0.05, 1254.37]) {
      expect(toReais(toCents(reais))).toBe(reais);
    }
  });
});
