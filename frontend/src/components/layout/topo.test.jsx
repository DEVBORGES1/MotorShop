// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LOJA, renderizar } from '@/test/renderizar.jsx';

import { BarraDeTopo } from './BarraDeTopo.jsx';
import { BuscaNoCabecalho } from './BuscaNoCabecalho.jsx';

describe('BarraDeTopo', () => {
  beforeEach(() => {
    // Só o relógio: os temporizadores reais seguem, para o React e o RTL funcionarem.
    vi.useFakeTimers({ toFake: ['Date'] });
    // Segunda-feira, 10h — dentro do horário da LOJA de teste (08:00 às 18:00).
    vi.setSystemTime(new Date(2026, 8, 28, 10, 0));
  });
  afterEach(() => vi.useRealTimers());

  it('mostra o slogan, se a loja está aberta agora e o telefone (com link para ligar)', () => {
    renderizar(<BarraDeTopo />);

    expect(screen.getByText('Motos revisadas')).toBeTruthy();
    expect(screen.getByText('Aberto agora · fecha às 18:00')).toBeTruthy();
    const telefone = screen.getByRole('link', { name: '(49) 3555-0000' });
    expect(telefone.getAttribute('href')).toBe('tel:4935550000');
  });

  it('fora do horário, diz quando a loja abre', () => {
    vi.setSystemTime(new Date(2026, 8, 28, 20, 0));
    renderizar(<BarraDeTopo />);

    expect(screen.getByText(/Fechado agora · abre/)).toBeTruthy();
  });

  it('sem horários, não afirma nada sobre estar aberta', () => {
    renderizar(<BarraDeTopo />, { store: { ...LOJA, businessHours: [] } });

    expect(screen.queryByText(/Aberto agora|Fechado agora/)).toBeNull();
    expect(screen.getByRole('link', { name: '(49) 3555-0000' })).toBeTruthy();
  });

  it('sem slogan, telefone nem horários, a faixa não aparece', () => {
    const { container } = renderizar(<BarraDeTopo />, {
      store: { ...LOJA, slogan: null, contact: {}, businessHours: [] },
    });

    expect(container.textContent).toBe('');
  });
});

describe('BuscaNoCabecalho', () => {
  const abrir = async (user) => {
    await user.click(screen.getByRole('button', { name: 'Buscar moto' }));
    return screen.getByRole('searchbox', { name: /Buscar moto por marca ou modelo/ });
  };
  const estoque = [{ path: '/estoque', element: <p>página do estoque</p> }];

  it('nasce fechada; a lupa abre o campo, já com o foco', async () => {
    const { user } = renderizar(<BuscaNoCabecalho />);
    expect(screen.queryByRole('searchbox')).toBeNull();

    const campo = await abrir(user);

    expect(document.activeElement).toBe(campo);
    expect(screen.getByRole('button', { name: 'Fechar busca' }).getAttribute('aria-expanded')).toBe(
      'true',
    );
  });

  it('a busca leva ao estoque já filtrado pelo termo', async () => {
    const { user, router } = renderizar(<BuscaNoCabecalho />, { outrasRotas: estoque });
    const campo = await abrir(user);

    await user.type(campo, 'CB 500{Enter}');

    expect(router.state.location.pathname).toBe('/estoque');
    expect(new URLSearchParams(router.state.location.search).get('q')).toBe('CB 500');
    // Fecha depois de buscar.
    expect(screen.queryByRole('searchbox')).toBeNull();
  });

  it('termo de um caractere não é enviado (a API exige dois ou mais)', async () => {
    const { user, router } = renderizar(<BuscaNoCabecalho />, { outrasRotas: estoque });
    const campo = await abrir(user);

    await user.type(campo, 'a{Enter}');

    expect(router.state.location.pathname).toBe('/');
  });

  it('Esc fecha a busca', async () => {
    const { user } = renderizar(<BuscaNoCabecalho />);
    const campo = await abrir(user);

    await user.type(campo, '{Escape}');

    expect(screen.queryByRole('searchbox')).toBeNull();
  });
});
