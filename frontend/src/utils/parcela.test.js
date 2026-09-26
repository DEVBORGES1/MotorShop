import { describe, expect, it } from 'vitest';

import { parcelaEstimada } from './simulador.js';

const financing = {
  monthlyRate: 1.79,
  installmentOptions: [12, 24, 36, 48],
  minDownPaymentPercent: 20,
};
const features = { financingEnabled: true };

describe('parcelaEstimada (card da moto)', () => {
  it('usa o maior prazo e a entrada mínima — o mesmo ponto de partida do simulador', () => {
    expect(parcelaEstimada(30000, features, financing)).toEqual({ parcelas: 48, valor: 749.39 });
  });

  it('não mostra parcela com o módulo desligado', () => {
    expect(parcelaEstimada(30000, { financingEnabled: false }, financing)).toBeNull();
    expect(parcelaEstimada(30000, undefined, financing)).toBeNull();
  });

  it('não mostra parcela sem taxa ou sem prazos configurados', () => {
    expect(parcelaEstimada(30000, features, { ...financing, monthlyRate: null })).toBeNull();
    expect(parcelaEstimada(30000, features, { ...financing, installmentOptions: [] })).toBeNull();
    expect(parcelaEstimada(30000, features, undefined)).toBeNull();
  });

  it('não inventa parcela para moto sem preço', () => {
    expect(parcelaEstimada(0, features, financing)).toBeNull();
    expect(parcelaEstimada(null, features, financing)).toBeNull();
  });

  it('taxa zero é uma taxa válida: divide o financiado pelo prazo', () => {
    const resultado = parcelaEstimada(12000, features, { ...financing, monthlyRate: 0 });
    // 12.000 com 20% de entrada = 9.600 em 48x.
    expect(resultado).toEqual({ parcelas: 48, valor: 200 });
  });
});
