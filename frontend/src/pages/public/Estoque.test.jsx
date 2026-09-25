// @vitest-environment jsdom
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as publicService from '@/services/publicService.js';
import { motoDeTeste, pagina, renderizar } from '@/test/renderizar.jsx';

import { Estoque } from './Estoque.jsx';

vi.mock('@/services/publicService.js', () => ({
  motos: { list: vi.fn() },
  filtros: { get: vi.fn() },
}));

const FAIXAS = {
  brands: [
    { slug: 'honda', name: 'Honda', count: 3 },
    { slug: 'yamaha', name: 'Yamaha', count: 1 },
  ],
  fuel: [
    { value: 'GASOLINE', count: 3 },
    { value: 'FLEX', count: 1 },
  ],
  transmission: [{ value: 'MANUAL', count: 4 }],
};

/** Parâmetros da última chamada ao catálogo. */
const ultimaBusca = () => publicService.motos.list.mock.lastCall[0];

describe('Estoque (filtros, ordenação e paginação)', () => {
  beforeEach(() => {
    publicService.motos.list.mockResolvedValue(pagina([motoDeTeste()]));
    publicService.filtros.get.mockResolvedValue(FAIXAS);
  });

  it('lista as motos e o total', async () => {
    renderizar(<Estoque />, { rota: '/estoque' });

    expect(await screen.findByRole('link', { name: 'Honda CB 500F' })).toBeTruthy();
    expect(screen.getByText('1 moto encontrada')).toBeTruthy();
  });

  it('marcar uma marca filtra a busca e vai para a URL (dá para compartilhar)', async () => {
    const { user, router } = renderizar(<Estoque />, { rota: '/estoque' });

    await user.click(await screen.findByRole('checkbox', { name: /Honda/ }));

    await waitFor(() => expect(ultimaBusca()).toMatchObject({ marca: 'honda', page: 1 }));
    expect(router.state.location.search).toContain('marca=honda');
    // O chip do filtro aparece e remove o filtro ao clicar.
    await user.click(screen.getByRole('button', { name: /Honda.*remover filtro/ }));
    await waitFor(() => expect(ultimaBusca().marca).toBeUndefined());
  });

  it('filtro vindo da URL já chega aplicado (link compartilhado)', async () => {
    renderizar(<Estoque />, { rota: '/estoque?marca=yamaha&precoMax=30000' });

    await waitFor(() =>
      expect(ultimaBusca()).toMatchObject({ marca: 'yamaha', precoMax: '30000' }),
    );
    expect(await screen.findByRole('checkbox', { name: /Yamaha/ })).toHaveProperty('checked', true);
  });

  it('preço máximo digitado só busca depois que a pessoa para de digitar', async () => {
    const { user } = renderizar(<Estoque />, { rota: '/estoque' });
    await screen.findByRole('link', { name: 'Honda CB 500F' });
    const chamadasAntes = publicService.motos.list.mock.calls.length;

    await user.type(screen.getByLabelText('Preço máximo'), '25000');
    expect(publicService.motos.list.mock.calls.length).toBe(chamadasAntes);

    await waitFor(() => expect(ultimaBusca()).toMatchObject({ precoMax: '25000' }), {
      timeout: 2000,
    });
    expect(publicService.motos.list.mock.calls.length).toBe(chamadasAntes + 1);
  });

  it('ordenar muda o parâmetro de ordenação', async () => {
    const { user } = renderizar(<Estoque />, { rota: '/estoque' });
    await screen.findByRole('link', { name: 'Honda CB 500F' });

    await user.selectOptions(screen.getByLabelText('Ordenar'), 'Menor preço');

    await waitFor(() => expect(ultimaBusca().sort).toBe('preco_asc'));
  });

  it('paginação pede a página seguinte, mantendo o filtro', async () => {
    publicService.motos.list.mockResolvedValue(
      pagina([motoDeTeste()], { total: 30, totalPages: 2 }),
    );
    const { user } = renderizar(<Estoque />, { rota: '/estoque?marca=honda' });
    await screen.findByRole('link', { name: 'Honda CB 500F' });

    await user.click(screen.getByRole('button', { name: /2/ }));

    await waitFor(() => expect(ultimaBusca()).toMatchObject({ marca: 'honda', page: 2 }));
  });

  it('sem resultado com filtro: explica e oferece limpar', async () => {
    publicService.motos.list.mockResolvedValue(pagina([]));
    const { user, router } = renderizar(<Estoque />, { rota: '/estoque?marca=yamaha' });

    expect(await screen.findByText('Nenhuma moto encontrada')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    await waitFor(() => expect(router.state.location.search).not.toContain('marca'));
  });

  it('API fora do ar: mensagem de erro no lugar da lista', async () => {
    publicService.motos.list.mockRejectedValue(new Error('Não foi possível carregar o estoque'));
    renderizar(<Estoque />, { rota: '/estoque' });

    expect(await screen.findByText('Não foi possível carregar o estoque')).toBeTruthy();
  });
});
