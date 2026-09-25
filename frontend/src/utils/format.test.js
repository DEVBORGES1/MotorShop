import { describe, expect, it } from 'vitest';

import {
  formatarCilindrada,
  formatarKm,
  formatarPreco,
  formatarTelefone,
  iniciais,
} from './format.js';

describe('formatarPreco', () => {
  // O Intl separa "R$" do número com espaço inquebrável (U+00A0), não com
  // espaço comum — comparar com ' ' aqui falha por um caractere invisível.
  const reais = (texto) => texto.replace(/\u00A0/g, ' ');

  it('formata em reais', () => {
    expect(reais(formatarPreco(36900))).toBe('R$ 36.900,00');
  });

  it('mostra travessão em vez de "R$ 0,00" quando não há preço', () => {
    expect(formatarPreco(null)).toBe('—');
    expect(formatarPreco(undefined)).toBe('—');
  });

  it('formata zero como zero — zero é um preço', () => {
    expect(reais(formatarPreco(0))).toBe('R$ 0,00');
  });
});

describe('formatarKm e formatarCilindrada', () => {
  it('separam milhar e põem a unidade', () => {
    expect(formatarKm(8400)).toBe('8.400 km');
    expect(formatarCilindrada(471)).toBe('471 cc');
  });

  it('mostram travessão sem valor', () => {
    expect(formatarKm(null)).toBe('—');
    expect(formatarCilindrada(null)).toBe('—');
  });

  it('formatam zero km — moto zero existe', () => {
    expect(formatarKm(0)).toBe('0 km');
  });
});

describe('iniciais', () => {
  it('usa a primeira e a última palavra', () => {
    expect(iniciais('João Vitor Borges')).toBe('JB');
    expect(iniciais('Ana Paula Souza')).toBe('AS');
  });

  it('repete nada quando há uma palavra só', () => {
    expect(iniciais('Rafael')).toBe('R');
  });

  it('aguenta espaços extras e nome ausente', () => {
    expect(iniciais('  maria   silva  ')).toBe('MS');
    expect(iniciais('')).toBe('—');
    expect(iniciais(null)).toBe('—');
  });
});

describe('formatarTelefone', () => {
  it('formata celular e fixo em E.164', () => {
    expect(formatarTelefone('+5549999998888')).toBe('(49) 99999-8888');
    expect(formatarTelefone('+554935655098')).toBe('(49) 3565-5098');
  });

  it('devolve como veio o que não reconhece', () => {
    expect(formatarTelefone('123')).toBe('123');
    expect(formatarTelefone(null)).toBe('—');
  });
});
