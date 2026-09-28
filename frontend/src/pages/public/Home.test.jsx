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

  it('cards com parcela trazem o aviso legal uma vez, sob a grade (R-07)', async () => {
    renderizar(<Home />);

    const avisos = await screen.findAllByText(/Não constitui proposta de crédito/);
    // Uma grade por seção com motos (destaques, ofertas e recentes): um aviso em cada.
    expect(avisos.length).toBeGreaterThan(0);
    expect(avisos.length).toBeLessThanOrEqual(3);
  });

  it('com o módulo de troca ligado, mostra os três passos e leva ao formulário', async () => {
    renderizar(<Home />);

    const passos = await screen.findByRole('region', { name: 'Como funciona a troca' });
    expect(within(passos).getAllByRole('listitem')).toHaveLength(3);
    expect(
      within(passos).getByRole('link', { name: 'Quero avaliar minha moto' }).getAttribute('href'),
    ).toBe('/venda-sua-moto');
  });

  it('com o módulo de troca desligado, os passos não aparecem', async () => {
    const store = { ...LOJA, features: { financingEnabled: true, sellMotoEnabled: false } };
    renderizar(<Home />, { store });

    await screen.findByRole('link', { name: /Ver estoque · 12 motos/ });
    expect(screen.queryByRole('region', { name: 'Como funciona a troca' })).toBeNull();
  });

  describe('localização', () => {
    it('mostra endereço, horários e o "como chegar" da loja', async () => {
      renderizar(<Home />);

      const bloco = await screen.findByRole('region', { name: 'Onde estamos' });
      expect(within(bloco).getByText('Rua das Motos, 10')).toBeTruthy();
      expect(within(bloco).getByText('08:00 às 18:00')).toBeTruthy();
      expect(
        within(bloco)
          .getByRole('link', { name: /Como chegar/ })
          .getAttribute('href'),
      ).toContain('google.com/maps/search');
    });

    it('o mapa só vira iframe depois do clique (nada é enviado ao Google antes)', async () => {
      const { user, container } = renderizar(<Home />);
      const bloco = await screen.findByRole('region', { name: 'Onde estamos' });

      expect(container.querySelector('iframe')).toBeNull();
      expect(within(bloco).getByText(/o Google recebe o seu acesso/)).toBeTruthy();

      await user.click(within(bloco).getByRole('button', { name: 'Ver mapa' }));

      const quadro = container.querySelector('iframe');
      expect(quadro.getAttribute('src')).toMatch(/^https:\/\/www\.google\.com\/maps\?q=/);
      expect(quadro.getAttribute('title')).toContain('Rua das Motos, 10');
      expect(quadro.getAttribute('sandbox')).toBeTruthy();
    });

    it('sem endereço nem horários, o bloco não aparece', async () => {
      const store = { ...LOJA, address: {}, businessHours: [] };
      renderizar(<Home />, { store });

      await screen.findByRole('link', { name: /Ver estoque · 12 motos/ });
      expect(screen.queryByRole('region', { name: 'Onde estamos' })).toBeNull();
    });

    it('sem rua, mostra os dados mas sem o botão de mapa', async () => {
      const store = { ...LOJA, address: { city: 'Chapecó', state: 'SC' } };
      renderizar(<Home />, { store });

      const bloco = await screen.findByRole('region', { name: 'Onde estamos' });
      expect(within(bloco).queryByRole('button', { name: 'Ver mapa' })).toBeNull();
    });
  });

  describe('hero com foto grande', () => {
    it('a foto do hero é de uma moto, identificada num cartão que leva à página dela', async () => {
      renderizar(<Home />);

      const cartao = await screen.findByRole('link', { name: /Na foto.*Honda CB 500F/ });
      expect(cartao.getAttribute('href')).toBe('/motos/honda-cb-500f-2024');
    });

    it('escolhe o destaque antes da oferta e da mais recente', async () => {
      const destaque = comFoto({ id: 'd', slug: 'moto-destaque', model: 'Destaque' });
      const outra = comFoto({ id: 'o', slug: 'moto-outra', model: 'Outra' });
      publicService.motos.list.mockImplementation(async (params) =>
        pagina(params.destaque ? [destaque] : [outra]),
      );
      renderizar(<Home />);

      const cartao = await screen.findByRole('link', { name: /Na foto/ });
      expect(cartao.getAttribute('href')).toBe('/motos/moto-destaque');
    });

    it('pula a moto sem foto e usa a próxima que tem', async () => {
      const semFoto = motoDeTeste({ id: 'a', slug: 'sem-foto', model: 'Sem foto' });
      const comImagem = comFoto({ id: 'b', slug: 'com-foto', model: 'Com foto' });
      publicService.motos.list.mockResolvedValue(pagina([semFoto, comImagem]));
      renderizar(<Home />);

      const cartao = await screen.findByRole('link', { name: /Na foto/ });
      expect(cartao.getAttribute('href')).toBe('/motos/com-foto');
    });

    it('sem nenhuma foto, o hero fica só com texto (sem cartão nem imagem quebrada)', async () => {
      publicService.motos.list.mockResolvedValue(pagina([motoDeTeste()]));
      renderizar(<Home />);

      await screen.findByRole('link', { name: /Ver estoque · 12 motos/ });
      expect(screen.queryByRole('link', { name: /Na foto/ })).toBeNull();
    });

    it('com várias motos com foto, vira carrossel e as setas trocam a moto', async () => {
      publicService.motos.list.mockResolvedValue(
        pagina([
          comFoto({ id: 'a', slug: 'moto-a', model: 'Alfa' }),
          comFoto({ id: 'b', slug: 'moto-b', model: 'Beta' }),
        ]),
      );
      const { user } = renderizar(<Home />);

      const hero = await screen.findByRole('region', { name: 'Motos em destaque' });
      expect(within(hero).getByRole('link', { name: /Na foto.*Alfa/ })).toBeTruthy();

      await user.click(within(hero).getByRole('button', { name: 'Próxima moto' }));
      expect(within(hero).getByRole('link', { name: /Na foto.*Beta/ })).toBeTruthy();
    });

    it('com as listas vindas do servidor, o hero já sai com a foto, sem pedir à API', () => {
      const destaque = comFoto({ id: 'd', slug: 'moto-destaque', model: 'Destaque' });
      renderizar(<Home />, {
        dados: {
          home: {
            destaques: pagina([destaque]),
            ofertas: pagina([]),
            recentes: pagina([destaque]),
          },
        },
      });

      // Síncrono: nada foi esperado.
      expect(screen.getByRole('link', { name: /Na foto.*Destaque/ })).toBeTruthy();
      expect(publicService.motos.list).not.toHaveBeenCalled();
    });

    it('com uma moto só, não há setas nem pontos', async () => {
      renderizar(<Home />);

      await screen.findByRole('link', { name: /Na foto/ });
      expect(screen.queryByRole('button', { name: 'Próxima moto' })).toBeNull();
      expect(screen.queryByRole('region', { name: 'Motos em destaque' })).toBeNull();
    });
  });

  describe('destaques em cartões grandes', () => {
    const secaoDestaques = async () =>
      (await screen.findByRole('heading', { name: 'Destaques', level: 2 })).closest('section');

    it('mostra cada destaque num cartão com link, preço e ficha', async () => {
      publicService.motos.list.mockResolvedValue(
        pagina([
          comFoto({ id: 'a', slug: 'moto-a', model: 'Alfa' }),
          comFoto({ id: 'b', slug: 'moto-b', model: 'Beta' }),
        ]),
      );
      renderizar(<Home />);

      const secao = await secaoDestaques();
      const cartoes = within(secao).getAllByRole('article');
      expect(cartoes).toHaveLength(2);
      const link = within(cartoes[0]).getByRole('link', { name: 'Honda Alfa' });
      expect(link.getAttribute('href')).toBe('/motos/moto-a');
      expect(within(cartoes[0]).getByText(/R\$\s*38\.900/)).toBeTruthy();
      expect(within(cartoes[0]).getByText(/2024 · 4\.200 km · 471 cc/)).toBeTruthy();
    });

    it('com número ímpar, o último cartão ocupa a linha toda', async () => {
      publicService.motos.list.mockResolvedValue(
        pagina([1, 2, 3].map((n) => comFoto({ id: `m${n}`, slug: `m${n}`, model: `M${n}` }))),
      );
      renderizar(<Home />);

      const cartoes = within(await secaoDestaques()).getAllByRole('article');
      expect(cartoes).toHaveLength(3);
      expect(cartoes[2].className).toContain('md:col-span-2');
      expect(cartoes[0].className).not.toContain('md:col-span-2');
    });

    it('oferta mostra o preço antigo riscado no cartão', async () => {
      publicService.motos.list.mockResolvedValue(
        pagina([comFoto({ onSale: true, previousPrice: 42000 })]),
      );
      renderizar(<Home />);

      const cartao = within(await secaoDestaques()).getByRole('article');
      expect(within(cartao).getByText('Oferta')).toBeTruthy();
      expect(within(cartao).getByText(/R\$\s*42\.000/).className).toContain('line-through');
    });
  });

  describe('facilidades (financiamento e troca)', () => {
    it('mostra os dois blocos, cada um levando ao módulo', async () => {
      renderizar(<Home />);

      const bloco = await screen.findByRole('region', { name: 'Facilidades da loja' });
      const simular = within(bloco).getByRole('link', { name: 'Simular agora' });
      const avaliar = within(bloco).getByRole('link', { name: 'Quero avaliar' });
      expect(simular.getAttribute('href')).toBe('/financiamento');
      expect(avaliar.getAttribute('href')).toBe('/venda-sua-moto');
    });

    it('usa a foto de uma moto do estoque no fundo de cada bloco', async () => {
      renderizar(<Home />);

      const bloco = await screen.findByRole('region', { name: 'Facilidades da loja' });
      expect(bloco.querySelectorAll('img')).toHaveLength(2);
    });

    it('sem foto no estoque, o bloco fica com o fundo do tema, sem imagem', async () => {
      publicService.motos.list.mockResolvedValue(pagina([motoDeTeste()]));
      renderizar(<Home />);

      const bloco = await screen.findByRole('region', { name: 'Facilidades da loja' });
      expect(bloco.querySelectorAll('img')).toHaveLength(0);
    });

    it('módulo desligado tira o bloco; os dois desligados tiram a seção', async () => {
      const so = (features) => ({ ...LOJA, features });
      const { unmount } = renderizar(<Home />, {
        store: so({ financingEnabled: false, sellMotoEnabled: true }),
      });
      const bloco = await screen.findByRole('region', { name: 'Facilidades da loja' });
      expect(within(bloco).queryByRole('link', { name: 'Simular agora' })).toBeNull();
      expect(within(bloco).getByRole('link', { name: 'Quero avaliar' })).toBeTruthy();
      unmount();

      renderizar(<Home />, { store: so({ financingEnabled: false, sellMotoEnabled: false }) });
      await screen.findByRole('link', { name: /Ver estoque · 12 motos/ });
      expect(screen.queryByRole('region', { name: 'Facilidades da loja' })).toBeNull();
    });
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
