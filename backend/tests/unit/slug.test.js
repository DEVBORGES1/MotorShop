import { describe, expect, it } from 'vitest';

import { buildSlug, resolveUniqueSlug } from '../../src/utils/slug.js';

describe('buildSlug', () => {
  it('gera o formato esperado pela URL da moto', () => {
    expect(buildSlug(['Honda', 'CB 500F', null, 2024])).toBe('honda-cb-500f-2024');
  });

  it('ignora partes vazias (versão ausente)', () => {
    expect(buildSlug(['Yamaha', 'MT-03', null, 2023])).toBe('yamaha-mt-03-2023');
    expect(buildSlug(['Suzuki', 'V-Strom 650', 'XT', 2021])).toBe('suzuki-v-strom-650-xt-2021');
  });

  it('transliterra acentos e remove pontuação', () => {
    expect(buildSlug(['Ducati', 'Panigale V4 S', 'Edição Especial', 2024])).toBe(
      'ducati-panigale-v4-s-edicao-especial-2024',
    );
  });

  it('não produz caracteres fora de [a-z0-9-]', () => {
    expect(buildSlug(['BMW', 'R 1250 GS/Adventure (2020)', null, 2020])).toMatch(/^[a-z0-9-]+$/);
  });
});

describe('resolveUniqueSlug', () => {
  it('devolve o slug base quando não há colisão', async () => {
    const result = await resolveUniqueSlug('honda-cb-500f-2024', async () => false);
    expect(result).toBe('honda-cb-500f-2024');
  });

  it('acrescenta sufixo quando o slug já existe', async () => {
    const existentes = new Set(['honda-cb-500f-2024']);
    const result = await resolveUniqueSlug(
      'honda-cb-500f-2024',
      async (candidate) => existentes.has(candidate),
      () => '7b3f',
    );

    expect(result).toBe('honda-cb-500f-2024-7b3f');
  });

  it('tenta novos sufixos enquanto houver colisão', async () => {
    const existentes = new Set(['moto', 'moto-aaaa', 'moto-bbbb']);
    const sufixos = ['aaaa', 'bbbb', 'cccc'];
    let i = 0;

    const result = await resolveUniqueSlug(
      'moto',
      async (candidate) => existentes.has(candidate),
      () => sufixos[i++],
    );

    expect(result).toBe('moto-cccc');
  });

  it('falha alto em vez de entrar em laço infinito', async () => {
    await expect(
      resolveUniqueSlug(
        'moto',
        async () => true,
        () => 'fixo',
      ),
    ).rejects.toThrow(/slug único/);
  });
});
