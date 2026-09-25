import { describe, expect, it } from 'vitest';

import {
  atributosDeImagem,
  imagemPrincipal,
  imagensDaGaleria,
  nomeDaMoto,
  urlOtimizada,
} from './imagem.js';

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

describe('imagensDaGaleria', () => {
  it('põe a capa primeiro e as demais pela ordem do cadastro', () => {
    const galeria = imagensDaGaleria(
      moto(
        [
          { id: 'c', url: 'c.jpg', order: 2 },
          { id: 'a', url: 'a.jpg', order: 0 },
          { id: 'b', url: 'b.jpg', order: 1 },
        ],
        'c',
      ),
    );
    expect(galeria.map((imagem) => imagem.id)).toEqual(['c', 'a', 'b']);
  });

  it('sem capa definida, segue só a ordem', () => {
    const galeria = imagensDaGaleria(
      moto([
        { id: 'b', url: 'b.jpg', order: 1 },
        { id: 'a', url: 'a.jpg', order: 0 },
      ]),
    );
    expect(galeria.map((imagem) => imagem.id)).toEqual(['a', 'b']);
  });

  it('descarta imagem sem url e gera alt quando o cadastro não tem', () => {
    const galeria = imagensDaGaleria(moto([{ id: 'a', url: 'a.jpg' }, { id: 'x' }]));
    expect(galeria).toHaveLength(1);
    expect(galeria[0].alt).toBe('Honda CB 500F — foto 1 de 1');
  });

  it('moto sem fotos devolve lista vazia', () => {
    expect(imagensDaGaleria(moto([]))).toEqual([]);
    expect(imagensDaGaleria(null)).toEqual([]);
  });
});

describe('entrega otimizada', () => {
  const cloudinary = 'https://res.cloudinary.com/loja/image/upload/v17/loja/motos/a/foto.jpg';

  it('insere redimensionamento, f_auto e q_auto na URL do provedor', () => {
    expect(urlOtimizada(cloudinary, 480)).toBe(
      'https://res.cloudinary.com/loja/image/upload/c_limit,f_auto,q_auto,w_480/v17/loja/motos/a/foto.jpg',
    );
  });

  it('URL de fora do provedor volta intacta', () => {
    expect(urlOtimizada('https://exemplo.com/foto.jpg', 480)).toBe('https://exemplo.com/foto.jpg');
  });

  it('monta srcset e sizes por contexto', () => {
    const attrs = atributosDeImagem({ url: cloudinary, width: 1600, height: 1200 }, 'card');

    expect(attrs.srcSet.split(', ')).toHaveLength(4);
    expect(attrs.srcSet).toContain('w_320/v17/loja/motos/a/foto.jpg 320w');
    expect(attrs.srcSet).toContain('w_960/v17/loja/motos/a/foto.jpg 960w');
    expect(attrs.sizes).toMatch(/33vw/);
    expect(attrs.src).toContain('w_960');
    expect(attrs).toMatchObject({ width: 1600, height: 1200 });
  });

  it('sem otimização possível, não inventa srcset', () => {
    const attrs = atributosDeImagem({ url: 'https://exemplo.com/f.jpg' }, 'galeria');
    expect(attrs.src).toBe('https://exemplo.com/f.jpg');
    expect(attrs.srcSet).toBeUndefined();
    expect(attrs.sizes).toBeUndefined();
  });

  it('sem imagem, nada', () => {
    expect(atributosDeImagem(null, 'card')).toBeNull();
  });
});
