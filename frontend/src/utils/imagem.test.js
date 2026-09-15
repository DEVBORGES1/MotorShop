import { describe, expect, it } from 'vitest';

import { imagemPrincipal, nomeDaMoto } from './imagem.js';

const moto = (images, mainImageId) => ({
  brand: { name: 'Honda' },
  model: 'CB 500F',
  images,
  mainImageId,
});

describe('imagemPrincipal', () => {
  it('usa a capa marcada no cadastro', () => {
    const escolhida = imagemPrincipal(
      moto(
        [
          { id: 'a', url: 'a.jpg', order: 0 },
          { id: 'b', url: 'b.jpg', order: 1 },
        ],
        'b',
      ),
    );

    expect(escolhida.url).toBe('b.jpg');
  });

  it('sem capa marcada, usa a primeira pela ordem — não a primeira do array', () => {
    const escolhida = imagemPrincipal(
      moto([
        { id: 'a', url: 'a.jpg', order: 2 },
        { id: 'b', url: 'b.jpg', order: 0 },
      ]),
    );

    expect(escolhida.url).toBe('b.jpg');
  });

  it('cai no nome da moto quando a imagem não tem texto alternativo', () => {
    expect(imagemPrincipal(moto([{ id: 'a', url: 'a.jpg' }])).alt).toBe('Honda CB 500F');
  });

  it('devolve null quando não há foto utilizável', () => {
    // Quem chama desenha o espaço vazio em vez de um <img> sem src.
    expect(imagemPrincipal(moto([]))).toBeNull();
    expect(imagemPrincipal(moto([{ id: 'a' }]))).toBeNull();
    expect(imagemPrincipal(null)).toBeNull();
  });
});

describe('nomeDaMoto', () => {
  it('junta marca e modelo', () => {
    expect(nomeDaMoto(moto([]))).toBe('Honda CB 500F');
    expect(nomeDaMoto({ model: 'CB 500F' })).toBe('CB 500F');
  });
});
