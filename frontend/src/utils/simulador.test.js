import { describe, expect, it } from 'vitest';

import {
  entradaInicial,
  parcelasIniciais,
  resultadoDaSimulacao,
  tabelaDePrazos,
} from './simulador.js';

const loja = { monthlyRate: 1.79, installmentOptions: [12, 24, 36, 48], minDownPaymentPercent: 20 };

describe('valores iniciais', () => {
  it('começa na entrada mínima e no maior prazo', () => {
    expect(entradaInicial(30000, loja)).toBe(6000);
    expect(parcelasIniciais(loja)).toBe(48);
  });

  it('sem valor, entrada zero', () => {
    expect(entradaInicial(0, loja)).toBe(0);
  });
});

describe('resultadoDaSimulacao', () => {
  it('recalcula quando a entrada muda', () => {
    const a = resultadoDaSimulacao({ valor: 30000, entrada: 6000, parcelas: 48 }, loja);
    const b = resultadoDaSimulacao({ valor: 30000, entrada: 12000, parcelas: 48 }, loja);

    expect(a.installmentValue).toBeCloseTo(749.39, 2);
    expect(b.installmentValue).toBeLessThan(a.installmentValue);
  });

  it('erro de preenchimento vem antes da regra da loja', () => {
    expect(resultadoDaSimulacao({ valor: 30000, entrada: 30000, parcelas: 60 }, loja)).toEqual({
      erro: 'A entrada precisa ser menor que o valor da moto',
    });
  });

  it('aplica a entrada mínima da loja', () => {
    expect(resultadoDaSimulacao({ valor: 30000, entrada: 1000, parcelas: 48 }, loja).erro).toMatch(
      /mínima/,
    );
  });

  it('valor vazio não produz NaN', () => {
    const resultado = resultadoDaSimulacao({ valor: 0, entrada: 0, parcelas: 48 }, loja);
    expect(resultado).toEqual({ erro: 'Informe o valor da moto' });
  });
});

describe('tabelaDePrazos', () => {
  it('uma linha por prazo oferecido, parcela menor quanto maior o prazo', () => {
    const tabela = tabelaDePrazos({ valor: 30000, entrada: 6000 }, loja);
    expect(tabela.map((linha) => linha.parcelas)).toEqual([12, 24, 36, 48]);
    expect(tabela[0].valor).toBeGreaterThan(tabela[3].valor);
  });

  it('entrada inválida deixa as parcelas vazias, sem NaN', () => {
    const tabela = tabelaDePrazos({ valor: 1000, entrada: 5000 }, loja);
    expect(tabela.every((linha) => linha.valor === null)).toBe(true);
  });
});
