import { describe, expect, it } from 'vitest';

import { motosComFoto } from './imagem.js';

const foto = { id: 'i', url: 'https://cdn.loja.test/x.jpg' };
const moto = (id, comFoto = true) => ({ id, slug: id, images: comFoto ? [foto] : [] });

describe('motosComFoto', () => {
  it('descarta a moto sem foto e mantém a ordem das listas', () => {
    const resultado = motosComFoto([[moto('a', false), moto('b')], [moto('c')]]);

    expect(resultado.map((m) => m.id)).toEqual(['b', 'c']);
  });

  it('não repete a moto que aparece em mais de uma lista', () => {
    const resultado = motosComFoto([[moto('a'), moto('b')], [moto('b'), moto('c')], [moto('a')]]);

    expect(resultado.map((m) => m.id)).toEqual(['a', 'b', 'c']);
  });

  it('respeita o limite', () => {
    expect(motosComFoto([[moto('a'), moto('b'), moto('c')]], 2)).toHaveLength(2);
  });

  it('aceita lista ausente (a busca ainda não respondeu ou falhou)', () => {
    expect(motosComFoto([undefined, null, [moto('a')]]).map((m) => m.id)).toEqual(['a']);
    expect(motosComFoto([undefined])).toEqual([]);
  });
});
