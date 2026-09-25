import { describe, expect, it } from 'vitest';

import { emParalelo, moverFoto, ordenarFotos, problemaNoArquivo, triarArquivos } from './fotos.js';

const arquivo = (name, size = 1000, type = 'image/jpeg') => ({ name, size, type });

describe('ordenarFotos', () => {
  it('ordena pelo campo order', () => {
    expect(
      ordenarFotos([
        { id: 'b', order: 1 },
        { id: 'a', order: 0 },
      ]).map((f) => f.id),
    ).toEqual(['a', 'b']);
  });
});

describe('moverFoto', () => {
  const lista = ['a', 'b', 'c', 'd'];

  it('move para frente e para trás', () => {
    expect(moverFoto(lista, 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moverFoto(lista, 3, 0)).toEqual(['d', 'a', 'b', 'c']);
  });

  it('ignora posição inválida sem quebrar', () => {
    expect(moverFoto(lista, 0, 9)).toBe(lista);
    expect(moverFoto(lista, -1, 0)).toBe(lista);
  });

  it('não altera a lista original', () => {
    moverFoto(lista, 0, 1);
    expect(lista).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('problemaNoArquivo', () => {
  it('aceita formatos permitidos, inclusive HEIC sem type', () => {
    expect(problemaNoArquivo(arquivo('foto.JPG'))).toBeNull();
    expect(problemaNoArquivo(arquivo('IMG_0001.heic', 1000, ''))).toBeNull();
  });

  it('recusa formato não permitido e arquivo grande', () => {
    expect(problemaNoArquivo(arquivo('anim.gif', 1000, 'image/gif'))).toMatch(/Formato/);
    expect(problemaNoArquivo(arquivo('doc.pdf', 1000, 'application/pdf'))).toMatch(/Formato/);
    expect(problemaNoArquivo(arquivo('grande.jpg', 11 * 1024 * 1024))).toMatch(/10 MB/);
  });
});

describe('triarArquivos', () => {
  it('respeita as vagas até 20 fotos', () => {
    const escolhidos = [arquivo('a.jpg'), arquivo('b.jpg'), arquivo('c.jpg')];
    const { aceitos, recusados } = triarArquivos(escolhidos, 18);

    expect(aceitos.map((a) => a.name)).toEqual(['a.jpg', 'b.jpg']);
    expect(recusados).toEqual([{ arquivo: escolhidos[2], motivo: 'Limite de 20 fotos por moto' }]);
  });

  it('recusado por formato não consome vaga', () => {
    const { aceitos } = triarArquivos([arquivo('x.gif', 1, 'image/gif'), arquivo('a.jpg')], 19);
    expect(aceitos.map((a) => a.name)).toEqual(['a.jpg']);
  });
});

describe('emParalelo', () => {
  it('processa todos, nunca mais que o limite ao mesmo tempo', async () => {
    let ativos = 0;
    let pico = 0;
    const feitos = [];

    await emParalelo([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      ativos += 1;
      pico = Math.max(pico, ativos);
      await new Promise((resolve) => setTimeout(resolve, 5));
      feitos.push(n);
      ativos -= 1;
    });

    expect(feitos.sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(pico).toBe(3);
  });
});
