// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as publicService from '@/services/publicService.js';
import { LOJA, motoDeTeste, pagina, renderizar } from '@/test/renderizar.jsx';

import { Home } from './Home.jsx';

vi.mock('@/services/publicService.js', () => ({
  motos: { list: vi.fn() },
  filtros: { get: vi.fn() },
}));

const FAIXAS = {
  total: 12,
  price: { min: 8900, max: 45000 },
  year: { min: 2018, max: 2024 },
  mileage: { min: 0, max: 60000 },
  engineCapacity: { min: 150, max: 471 },
  brands: [
    { slug: 'honda', name: 'Honda', count: 7 },
    { slug: 'yamaha', name: 'Yamaha', count: 5 },
  ],
};

const comFoto = (extra = {}) =>
  motoDeTeste({
    images: [{ id: 'i1', url: 'https://cdn.loja.test/cb.jpg', alt: 'CB de frente' }],
    mainImageId: 'i1',
    ...extra,
  });

describe('Home', () => {
  beforeEach(() => {
    publicService.motos.list.mockResolvedValue(pagina([comFoto()]));
    publicService.filtros.get.mockResolvedValue(FAIXAS);
  });

  it('mostra o mosaico do hero com as motos que têm foto, levando à página delas', async () => {
    renderizar(<Home />);

    const mosaico = await screen.findByRole('list', { name: 'Motos em destaque' });
    const link = within(mosaico).getByRole('link', { name: /Honda CB 500F/ });

    expect(link.getAttribute('href')).toBe('/motos/honda-cb-500f-2024');
  });

  it('sem nenhuma foto, o hero fica só com texto (sem mosaico quebrado)', async () => {
    publicService.motos.list.mockResolvedValue(pagina([motoDeTeste()]));
    renderizar(<Home />);

    await screen.findByRole('link', { name: /Ver estoque · 12 motos/ });
    expect(screen.queryByRole('list', { name: 'Motos em destaque' })).toBeNull();
  });

  it('mostra o logo da loja no hero quando ele existe', () => {
    const store = {
      ...LOJA,
      logo: { url: 'https://cdn.loja.test/logo.png', width: 200, height: 100 },
    };
    renderizar(<Home />, { store });

    const logos = screen.getAllByRole('img', { name: LOJA.name });
    expect(logos.length).toBeGreaterThan(0);
  });

  it('faixa de números vem das faixas reais do estoque', async () => {
    renderizar(<Home />);

    const faixa = await screen.findByRole('region', { name: 'O estoque em números' });
    expect(within(faixa).getByText('12')).toBeTruthy();
    expect(within(faixa).getByText('2018–2024')).toBeTruthy();
    expect(within(faixa).getByText('Marcas')).toBeTruthy();
  });

  it('sem estoque, a faixa de números não aparece', async () => {
    publicService.filtros.get.mockResolvedValue({ ...FAIXAS, total: 0, brands: [] });
    renderizar(<Home />);

    await waitFor(() => expect(publicService.filtros.get).toHaveBeenCalled());
    expect(screen.queryByRole('region', { name: 'O estoque em números' })).toBeNull();
  });

  it('cada marca da faixa leva ao estoque já filtrado', async () => {
    renderizar(<Home />);

    const marcas = await screen.findByRole('link', { name: /^Yamaha/ });
    expect(marcas.getAttribute('href')).toBe('/estoque?marca=yamaha');
  });

  it('busca rápida com marca, cilindrada e preço monta a URL do estoque', async () => {
    const { user, router } = renderizar(<Home />, {
      outrasRotas: [{ path: '/estoque', element: <p>estoque</p> }],
    });

    await screen.findByRole('option', { name: 'Honda' });
    await user.selectOptions(screen.getByLabelText('Marca'), 'honda');
    await user.selectOptions(screen.getByLabelText('Cilindrada'), '301-600');
    await user.selectOptions(screen.getByLabelText('Preço até'), '30000');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));

    const busca = new URLSearchParams(router.state.location.search);
    expect(router.state.location.pathname).toBe('/estoque');
    expect(Object.fromEntries(busca)).toEqual({
      marca: 'honda',
      ccMin: '301',
      ccMax: '600',
      precoMax: '30000',
    });
  });

  it('só oferece faixas de cilindrada que existem no estoque', async () => {
    renderizar(<Home />);
    await screen.findByRole('option', { name: 'Honda' });

    expect(screen.getByRole('option', { name: 'Até 160 cc' })).toBeTruthy();
    expect(screen.getByRole('option', { name: '301 a 600 cc' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: 'Acima de 600 cc' })).toBeNull();
  });
});
