import { describe, expect, it } from 'vitest';

import { acaoDaTecla, direcaoDoArraste, indiceAposAcao, indiceVizinho } from './galeria.js';

describe('indiceVizinho', () => {
  it('avança e volta', () => {
    expect(indiceVizinho(1, 5, 1)).toBe(2);
    expect(indiceVizinho(1, 5, -1)).toBe(0);
  });

  it('dá a volta nas pontas', () => {
    expect(indiceVizinho(4, 5, 1)).toBe(0);
    expect(indiceVizinho(0, 5, -1)).toBe(4);
  });

  it('com uma foto, fica nela', () => {
    expect(indiceVizinho(0, 1, 1)).toBe(0);
    expect(indiceVizinho(0, 1, -1)).toBe(0);
  });

  it('sem fotos, não produz índice inválido', () => {
    expect(indiceVizinho(0, 0, 1)).toBe(0);
  });
});

describe('teclado', () => {
  it('setas, Home e End viram ações', () => {
    expect(acaoDaTecla('ArrowLeft')).toBe('anterior');
    expect(acaoDaTecla('ArrowRight')).toBe('proxima');
    expect(acaoDaTecla('Home')).toBe('primeira');
    expect(acaoDaTecla('End')).toBe('ultima');
  });

  it('outras teclas não fazem nada — Esc é do <dialog>', () => {
    expect(acaoDaTecla('Escape')).toBeNull();
    expect(acaoDaTecla('a')).toBeNull();
  });

  it('aplica a ação ao índice', () => {
    expect(indiceAposAcao('proxima', 4, 5)).toBe(0);
    expect(indiceAposAcao('anterior', 0, 5)).toBe(4);
    expect(indiceAposAcao('primeira', 3, 5)).toBe(0);
    expect(indiceAposAcao('ultima', 0, 5)).toBe(4);
    expect(indiceAposAcao(null, 2, 5)).toBe(2);
  });
});

describe('direcaoDoArraste', () => {
  it('dedo para a esquerda avança, para a direita volta', () => {
    expect(direcaoDoArraste(-80, 5)).toBe(1);
    expect(direcaoDoArraste(80, 5)).toBe(-1);
  });

  it('ignora arraste curto', () => {
    expect(direcaoDoArraste(-20, 0)).toBe(0);
  });

  it('ignora arraste mais vertical que horizontal — é rolagem', () => {
    expect(direcaoDoArraste(-60, 120)).toBe(0);
  });
});
