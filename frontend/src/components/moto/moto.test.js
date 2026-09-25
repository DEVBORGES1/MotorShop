import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { MotoFeatures } from './MotoFeatures.jsx';
import { MotoGallery } from './MotoGallery.jsx';
import { MotoSpecs } from './MotoSpecs.jsx';
import { StatusBadge } from './StatusBadge.jsx';

/**
 * Testes de componente sem DOM simulado: a FASE 5 não admite dependência nova,
 * e o que se verifica aqui é a marcação produzida. Teclado e arraste são
 * cobertos em `utils/galeria.test.js`, onde a lógica deles mora.
 */
const render = (componente, props) => renderToStaticMarkup(h(componente, props));

const foto = (n) => ({
  id: `f${n}`,
  url: `/f${n}.jpg`,
  alt: `Foto ${n}`,
  width: 1200,
  height: 900,
});

describe('MotoGallery', () => {
  it('sem fotos, mostra um aviso no lugar — nunca uma imagem quebrada', () => {
    const html = render(MotoGallery, { imagens: [], nome: 'Honda CB 500F' });
    expect(html).toContain('Sem fotos desta moto');
    expect(html).not.toContain('<img');
  });

  it('com uma foto, não mostra setas, contador nem miniaturas', () => {
    const html = render(MotoGallery, { imagens: [foto(1)], nome: 'Honda CB 500F' });
    expect(html).toContain('src="/f1.jpg"');
    expect(html).not.toContain('Próxima foto');
    expect(html).not.toContain('Ver foto');
    expect(html).not.toContain('1 / 1');
  });

  it('com várias, mostra a primeira, setas e uma miniatura por foto', () => {
    const html = render(MotoGallery, { imagens: [foto(1), foto(2), foto(3)], nome: 'Honda' });
    expect(html).toContain('Foto anterior');
    expect(html).toContain('Próxima foto');
    expect(html.match(/Ver foto \d de 3/g)).toHaveLength(3);
    expect(html).toContain('aria-current="true"');
  });

  it('leva largura e altura ao <img> — evita salto de layout', () => {
    const html = render(MotoGallery, { imagens: [foto(1)], nome: 'Honda' });
    expect(html).toMatch(/width="1200"/);
    expect(html).toMatch(/height="900"/);
  });
});

describe('MotoSpecs', () => {
  it('omite campos ausentes, sem "undefined" nem "null"', () => {
    const html = render(MotoSpecs, {
      moto: { brand: { name: 'Honda' }, model: 'Biz', version: null, color: undefined },
    });
    expect(html).toContain('Honda');
    expect(html).toContain('Biz');
    expect(html).not.toContain('Versão');
    expect(html).not.toContain('Cor');
    expect(html).not.toMatch(/undefined|null/);
  });

  it('sem dados, não renderiza a lista vazia', () => {
    expect(render(MotoSpecs, { moto: {} })).toBe('');
  });
});

describe('MotoFeatures', () => {
  it('lista os opcionais e ignora itens em branco', () => {
    const html = render(MotoFeatures, { features: ['ABS', '  ', 'Revisada'] });
    expect(html.match(/<li/g)).toHaveLength(2);
  });

  it('sem opcionais, não renderiza nada', () => {
    expect(render(MotoFeatures, { features: [] })).toBe('');
  });
});

describe('StatusBadge', () => {
  it('traduz o status', () => {
    expect(render(StatusBadge, { status: 'SOLD' })).toContain('Vendida');
    expect(render(StatusBadge, { status: 'RESERVED' })).toContain('Reservada');
  });

  it('não expõe status interno', () => {
    expect(render(StatusBadge, { status: 'INACTIVE' })).toBe('');
  });
});
