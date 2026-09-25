import {
  checkFinancingRules,
  financingSettingsSchema,
  isFinancingConfigured,
  minimumDownPayment,
  simulateFinancing,
} from '@motorshop/shared';
import { describe, expect, it } from 'vitest';

/**
 * Valores de referência calculados de forma independente (Python, `Decimal`
 * com 50 dígitos, arredondamento meio-para-cima), não com esta função.
 */
const REFERENCIAS = [
  // [valor, entrada, parcelas, taxa % a.m.] → [parcela, total, juros]
  [
    [30000, 6000, 48, 1.79],
    [749.39, 35970.72, 11970.72],
  ],
  [
    [30000, 6000, 12, 1.79],
    [2240.26, 26883.12, 2883.12],
  ],
  [
    [33900, 6780, 36, 1.49],
    [978.82, 35237.52, 8117.52],
  ],
  [
    [1500, 500, 72, 1.99],
    [26.25, 1890.0, 890.0],
  ],
  [
    [200, 100, 3, 1.79],
    [34.53, 103.59, 3.59],
  ],
];

const simular = (valor, entrada, parcelas, taxa) =>
  simulateFinancing({
    vehiclePrice: valor,
    downPayment: entrada,
    installments: parcelas,
    monthlyRate: taxa,
  });

describe('simulateFinancing — tabela Price', () => {
  it.each(REFERENCIAS)('%j confere com a referência (erro < R$ 0,01)', (entrada, esperado) => {
    const resultado = simular(...entrada);
    const [parcela, total, juros] = esperado;

    expect(resultado.valid).toBe(true);
    expect(Math.abs(resultado.installmentValue - parcela)).toBeLessThan(0.01);
    expect(Math.abs(resultado.total - total)).toBeLessThan(0.01);
    expect(Math.abs(resultado.interest - juros)).toBeLessThan(0.01);
  });

  it('valor financiado é o valor menos a entrada', () => {
    expect(simular(30000, 6000, 48, 1.79).financed).toBe(24000);
  });

  it('taxa zero: sem divisão por zero, parcela = financiado / n, juros zero', () => {
    const resultado = simular(12000, 2000, 10, 0);
    expect(resultado).toMatchObject({
      valid: true,
      installmentValue: 1000,
      total: 10000,
      interest: 0,
    });
  });

  it('uma parcela: financiado acrescido de um mês de juros', () => {
    expect(simular(12000, 2000, 1, 2)).toMatchObject({ installmentValue: 10200, interest: 200 });
  });

  it('prazo máximo (72x) continua finito e coerente', () => {
    const resultado = simular(50000, 10000, 72, 2.5);
    expect(Number.isFinite(resultado.installmentValue)).toBe(true);
    expect(resultado.total).toBeGreaterThan(resultado.financed);
  });

  it('arredonda a parcela ao centavo, e o total usa a parcela arredondada', () => {
    const resultado = simular(200, 100, 3, 1.79);
    expect(Number.isInteger(Math.round(resultado.installmentValue * 100))).toBe(true);
    expect(resultado.total).toBeCloseTo(resultado.installmentValue * 3, 2);
  });

  it('entrada igual ou maior que o valor: erro claro, nunca NaN ou Infinity', () => {
    for (const entrada of [30000, 45000]) {
      const resultado = simular(30000, entrada, 12, 1.79);
      expect(resultado).toEqual({
        valid: false,
        error: 'A entrada precisa ser menor que o valor da moto',
      });
    }
  });

  it('recusa valores ausentes ou inválidos sem produzir NaN', () => {
    expect(simular(0, 0, 12, 1.79).valid).toBe(false);
    expect(simular(NaN, 0, 12, 1.79).valid).toBe(false);
    expect(simular(30000, -1, 12, 1.79).valid).toBe(false);
    expect(simular(30000, 0, 0, 1.79).valid).toBe(false);
    expect(simular(30000, 0, 12.5, 1.79).valid).toBe(false);
    expect(simular(30000, 0, 12, null).valid).toBe(false);
    expect(JSON.stringify(simular(NaN, NaN, NaN, NaN))).not.toMatch(/NaN|Infinity/);
  });

  it('entrada zero financia o valor inteiro', () => {
    expect(simular(10000, 0, 10, 0).financed).toBe(10000);
  });
});

describe('regras da loja', () => {
  const loja = {
    monthlyRate: 1.79,
    installmentOptions: [12, 24, 36, 48],
    minDownPaymentPercent: 20,
  };
  const regra = (entrada, parcelas) =>
    checkFinancingRules(
      { vehiclePrice: 30000, downPayment: entrada, installments: parcelas },
      loja,
    );

  it('aceita prazo oferecido e entrada no mínimo', () => {
    expect(regra(6000, 48)).toBeNull();
  });

  it('recusa prazo que a loja não oferece', () => {
    expect(regra(6000, 60)).toBe('Prazo não disponível');
  });

  it('recusa entrada abaixo do mínimo', () => {
    expect(regra(5999.99, 48)).toMatch(/entrada mínima é de 20%/);
  });

  it('entrada mínima arredonda para cima ao centavo', () => {
    expect(minimumDownPayment(33333.33, 20)).toBe(6666.67);
  });

  it('sem taxa ou sem prazos, a loja não está configurada', () => {
    expect(isFinancingConfigured({ monthlyRate: null, installmentOptions: [12] })).toBe(false);
    expect(isFinancingConfigured({ monthlyRate: 1.5, installmentOptions: [] })).toBe(false);
    expect(isFinancingConfigured(undefined)).toBe(false);
    expect(isFinancingConfigured({ monthlyRate: 0, installmentOptions: [12] })).toBe(true);
    expect(checkFinancingRules({ vehiclePrice: 1, downPayment: 0, installments: 12 }, {})).toMatch(
      /indisponível/,
    );
  });
});

describe('financingSettingsSchema', () => {
  it('aceita parâmetros válidos e ordena os prazos', () => {
    const { data } = financingSettingsSchema.safeParse({
      monthlyRate: 1.79,
      installmentOptions: [48, 12, 24],
      minDownPaymentPercent: 20,
    });
    expect(data.installmentOptions).toEqual([12, 24, 48]);
  });

  it('recusa taxa absurda (provável erro de digitação), prazo fora da faixa e repetido', () => {
    const base = { monthlyRate: 1.79, installmentOptions: [12], minDownPaymentPercent: 20 };
    expect(financingSettingsSchema.safeParse({ ...base, monthlyRate: 17.9 }).success).toBe(false);
    expect(financingSettingsSchema.safeParse({ ...base, installmentOptions: [3] }).success).toBe(
      false,
    );
    expect(
      financingSettingsSchema.safeParse({ ...base, installmentOptions: [12, 12] }).success,
    ).toBe(false);
  });

  it('aceita taxa nula — loja ainda não configurou', () => {
    expect(
      financingSettingsSchema.safeParse({
        monthlyRate: null,
        installmentOptions: [],
        minDownPaymentPercent: 0,
      }).success,
    ).toBe(true);
  });
});
