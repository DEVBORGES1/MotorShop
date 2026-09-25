import { describe, expect, it } from 'vitest';

import { caminhoDaMoto, especificacoes, urlDaMoto } from './moto.js';

const completa = {
  brand: { name: 'Honda' },
  model: 'CB 500F',
  version: 'ABS',
  year: 2024,
  mileage: 4200,
  engineCapacity: 471,
  fuel: 'FLEX',
  transmission: 'MANUAL',
  color: 'Vermelha',
};

describe('especificacoes', () => {
  it('lista todos os campos, com rótulos em português', () => {
    const ficha = especificacoes(completa);
    expect(ficha.map((linha) => linha.rotulo)).toEqual([
      'Marca',
      'Modelo',
      'Versão',
      'Ano',
      'Quilometragem',
      'Cilindrada',
      'Combustível',
      'Câmbio',
      'Cor',
    ]);
    expect(ficha.find((linha) => linha.rotulo === 'Combustível').valor).toBe('Flex');
    expect(ficha.find((linha) => linha.rotulo === 'Quilometragem').valor).toMatch(/4\.200 km/);
  });

  it('omite o que o cadastro não tem, sem "undefined" nem "null"', () => {
    const ficha = especificacoes({
      brand: { name: 'Honda' },
      model: 'Biz',
      version: null,
      color: '',
    });
    const texto = JSON.stringify(ficha);

    expect(ficha.map((linha) => linha.rotulo)).toEqual(['Marca', 'Modelo']);
    expect(texto).not.toContain('undefined');
    expect(texto).not.toContain('null');
  });

  it('mostra 0 km — moto zero não é campo ausente', () => {
    const ficha = especificacoes({ ...completa, mileage: 0 });
    expect(ficha.find((linha) => linha.rotulo === 'Quilometragem').valor).toBe('0 km');
  });

  it('sem moto, ficha vazia', () => {
    expect(especificacoes(null)).toEqual([]);
  });
});

describe('urlDaMoto', () => {
  it('monta o endereço absoluto, sem barra dobrada', () => {
    expect(urlDaMoto('honda-cb-500f-2024', 'https://loja.com.br/')).toBe(
      'https://loja.com.br/motos/honda-cb-500f-2024',
    );
  });

  it('sem slug ou sem base, não inventa link', () => {
    expect(urlDaMoto(null, 'https://loja.com.br')).toBeNull();
    expect(urlDaMoto('slug', null)).toBeNull();
  });
});

describe('caminhoDaMoto', () => {
  it('escapa o slug', () => {
    expect(caminhoDaMoto('a b')).toBe('/motos/a%20b');
  });
});
