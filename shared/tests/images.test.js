import { describe, expect, it } from 'vitest';

import { iconUrl, imageAttributes, logoUrl, optimizedImageUrl } from '../src/images.js';

const PROVEDOR = 'https://res.cloudinary.com/loja/image/upload/v1/motorshop/motos/abc/foto.jpg';
const EXTERNA = 'https://exemplo.com/foto.jpg';

describe('URLs de entrega', () => {
  it('foto: largura limitada, formato e qualidade automáticos', () => {
    expect(optimizedImageUrl(PROVEDOR, 640)).toBe(
      'https://res.cloudinary.com/loja/image/upload/c_limit,f_auto,q_auto,w_640/v1/motorshop/motos/abc/foto.jpg',
    );
  });

  it('logo: altura fixa (88 px cobre a tela de alta densidade), proporção mantida', () => {
    expect(logoUrl(PROVEDOR)).toContain('/image/upload/c_limit,f_auto,q_auto,h_88/v1/');
    expect(logoUrl(PROVEDOR, 120)).toContain(',h_120/');
  });

  it('ícone da aba: quadrado de 64 px em PNG, com margem em vez de corte', () => {
    expect(iconUrl(PROVEDOR)).toContain('/image/upload/c_pad,w_64,h_64,f_png/v1/');
  });

  it('URL fora do provedor ou ausente volta como veio — funciona, só sem otimizar', () => {
    for (const transformar of [optimizedImageUrl, logoUrl, iconUrl]) {
      expect(transformar(EXTERNA, 100)).toBe(EXTERNA);
      expect(transformar(null, 100)).toBeNull();
      expect(transformar(undefined, 100)).toBeUndefined();
    }
  });
});

describe('imageAttributes', () => {
  it('monta src, srcset e sizes do contexto, com as dimensões que reservam o espaço', () => {
    const attrs = imageAttributes({ url: PROVEDOR, width: 1600, height: 1200 }, 'card');

    expect(attrs.src).toContain(',w_960/');
    expect(attrs.srcSet.split(', ')).toHaveLength(4);
    expect(attrs.srcSet).toMatch(/,w_320\/.+ 320w/);
    expect(attrs.sizes).toMatch(/33vw/);
    expect(attrs).toMatchObject({ width: 1600, height: 1200 });
  });

  it('imagem externa: sem srcset (não há versões menores para oferecer)', () => {
    const attrs = imageAttributes({ url: EXTERNA, width: 800, height: 600 }, 'gallery');

    expect(attrs).toEqual({
      src: EXTERNA,
      srcSet: undefined,
      sizes: undefined,
      width: 800,
      height: 600,
    });
  });

  it('sem imagem: null, e o componente mostra o placeholder', () => {
    expect(imageAttributes(null, 'card')).toBeNull();
    expect(imageAttributes({ url: '' }, 'card')).toBeNull();
  });
});
