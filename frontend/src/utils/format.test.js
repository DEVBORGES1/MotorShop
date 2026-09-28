import { describe, expect, it } from 'vitest';

import {
  formatarCilindrada,
  formatarKm,
  formatarPreco,
  formatarTelefone,
  formatarValor,
  iniciais,
  lerValorEmReais,
} from './format.js';

describe('campo de reais', () => {
  it('formata com separador de milhar, e centavos só quando há', () => {
    expect(formatarValor(30000)).toBe('30.000');
    expect(formatarValor(6666.6)).toBe('6.666,60');
    expect(formatarValor(0)).toBe('0');
  });

  it('vazio continua vazio', () => {
    expect(formatarValor('')).toBe('');
    expect(formatarValor(null)).toBe('');
    expect(formatarValor(undefined)).toBe('');
  });

  it('lê o que a pessoa digita: ponto é milhar, vírgula é centavo', () => {
    expect(lerValorEmReais('30000')).toBe(30000);
    expect(lerValorEmReais('30.000')).toBe(30000);
    expect(lerValorEmReais('R$ 1.234.567')).toBe(1234567);
    expect(lerValorEmReais('6.666,60')).toBe(6666.6);
    expect(lerValorEmReais('10,5')).toBe(10.5);
    expect(lerValorEmReais('10,999')).toBe(10.99);
  });

  it('sem número, devolve vazio', () => {
    expect(lerValorEmReais('')).toBe('');
    expect(lerValorEmReais('abc')).toBe('');
    expect(lerValorEmReais(',')).toBe('');
  });

  it('o que formata, lê de volta igual', () => {
    for (const valor of [0, 15, 30000, 6666.6, 1234567.89]) {
      expect(lerValorEmReais(formatarValor(valor))).toBe(valor);
    }
  });
});

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
