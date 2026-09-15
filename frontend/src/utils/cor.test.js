import { describe, expect, it } from 'vitest';

import {
  ajustarLuminosidade,
  contraste,
  corDeTextoSobre,
  hexParaRgb,
  variaveisDoTema,
} from './cor.js';

describe('hexParaRgb', () => {
  it('lê hex de 6 e de 3 dígitos, com ou sem #', () => {
    expect(hexParaRgb('#4CD62B')).toEqual([76, 214, 43]);
    expect(hexParaRgb('4cd62b')).toEqual([76, 214, 43]);
    expect(hexParaRgb('#FFF')).toEqual([255, 255, 255]);
  });

  it('recusa o que não é hex', () => {
    expect(hexParaRgb('verde')).toBeNull();
    expect(hexParaRgb('#12345')).toBeNull();
    expect(hexParaRgb(null)).toBeNull();
  });
});

describe('contraste', () => {
  it('vai de 1 (iguais) a 21 (preto e branco)', () => {
    expect(contraste('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contraste('#4CD62B', '#4CD62B')).toBeCloseTo(1, 5);
  });

  it('confere o par do tema padrão', () => {
    // Acento verde sobre o fundo quase preto — o valor documentado nos tokens.
    expect(contraste('#4CD62B', '#0A0B0A')).toBeCloseTo(10.29, 1);
  });
});

describe('ajustarLuminosidade', () => {
  it('clareia e escurece mantendo o matiz', () => {
    const claro = ajustarLuminosidade('#4CD62B', 12);
    const escuro = ajustarLuminosidade('#4CD62B', -10);

    expect(contraste(claro, '#000000')).toBeGreaterThan(contraste('#4CD62B', '#000000'));
    expect(contraste(escuro, '#000000')).toBeLessThan(contraste('#4CD62B', '#000000'));
  });

  it('satura nos extremos em vez de estourar', () => {
    expect(ajustarLuminosidade('#ffffff', 50)).toBe('#ffffff');
    expect(ajustarLuminosidade('#000000', -50)).toBe('#000000');
  });
});

describe('corDeTextoSobre', () => {
  it('usa texto escuro sobre cor clara e claro sobre cor escura', () => {
    expect(corDeTextoSobre('#4CD62B')).toBe('#07120a');
    expect(corDeTextoSobre('#1D4ED8')).toBe('#f2f4f1');
  });
});

describe('variaveisDoTema', () => {
  it('deriva os três tons e o texto a partir de uma cor só', () => {
    const vars = variaveisDoTema('#4CD62B');

    expect(vars['--color-brand-500']).toBe('#4CD62B');
    expect(vars['--color-on-brand']).toBe('#07120a');
    expect(vars['--color-brand-400']).toMatch(/^#[0-9a-f]{6}$/);
    expect(vars['--color-brand-600']).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('o texto derivado é sempre legível sobre a primária escolhida', () => {
    // A loja escolhe a cor; a legibilidade do botão não pode depender disso.
    for (const cor of ['#4CD62B', '#1D4ED8', '#FACC15', '#7C3AED', '#FFFFFF', '#000000']) {
      const vars = variaveisDoTema(cor);
      expect(contraste(cor, vars['--color-on-brand'])).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('devolve vazio sem cor válida, deixando o tema padrão valer', () => {
    expect(variaveisDoTema(null)).toEqual({});
    expect(variaveisDoTema('roxo')).toEqual({});
  });
});
