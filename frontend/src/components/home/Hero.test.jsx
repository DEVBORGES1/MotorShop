// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LOJA, motoDeTeste } from '@/test/renderizar.jsx';

import { Hero, INTERVALO_DO_HERO_MS } from './Hero.jsx';

const comFoto = (id, model) =>
  motoDeTeste({
    id,
    slug: `moto-${id}`,
    model,
    images: [{ id: `f${id}`, url: `https://cdn.loja.test/${id}.jpg` }],
    mainImageId: `f${id}`,
  });

const MOTOS = [comFoto('a', 'Alfa'), comFoto('b', 'Beta'), comFoto('c', 'Gama')];

function renderizarHero(motos = MOTOS) {
  return render(
    <MemoryRouter>
      <Hero store={LOJA} total={3} whatsapp={() => null} motos={motos} />
    </MemoryRouter>,
  );
}

const cartao = () => screen.getByRole('link', { name: /Na foto/ });
const passar = (ms) => act(() => vi.advanceTimersByTime(ms));

describe('Hero em carrossel', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('troca sozinha no intervalo e volta à primeira depois da última', () => {
    renderizarHero();
    expect(cartao().textContent).toContain('Alfa');

    passar(INTERVALO_DO_HERO_MS - 1);
    expect(cartao().textContent).toContain('Alfa');
    passar(1);
    expect(cartao().textContent).toContain('Beta');
    passar(INTERVALO_DO_HERO_MS);
    expect(cartao().textContent).toContain('Gama');
    passar(INTERVALO_DO_HERO_MS);
    expect(cartao().textContent).toContain('Alfa');
  });

  it('a troca à mão reinicia a contagem', () => {
    renderizarHero();

    passar(INTERVALO_DO_HERO_MS - 1000);
    fireEvent.click(screen.getByRole('button', { name: 'Próxima moto' }));
    expect(cartao().textContent).toContain('Beta');

    passar(INTERVALO_DO_HERO_MS - 1000);
    expect(cartao().textContent).toContain('Beta');
    passar(1000);
    expect(cartao().textContent).toContain('Gama');
  });

  it('seta anterior na primeira vai à última', () => {
    renderizarHero();

    fireEvent.click(screen.getByRole('button', { name: 'Moto anterior' }));
    expect(cartao().textContent).toContain('Gama');
  });

  it('cada ponto leva à sua moto e marca a atual', () => {
    renderizarHero();

    const ponto = screen.getByRole('button', { name: 'Ver moto 3 de 3: Honda Gama' });
    fireEvent.click(ponto);
    expect(cartao().textContent).toContain('Gama');
    expect(ponto.getAttribute('aria-current')).toBe('true');
    expect(
      screen.getByRole('button', { name: /Ver moto 1 de 3/ }).getAttribute('aria-current'),
    ).toBeNull();
  });

  it('setas do teclado nos controles trocam a moto', () => {
    renderizarHero();

    fireEvent.keyDown(screen.getByRole('button', { name: 'Próxima moto' }), { key: 'ArrowRight' });
    expect(cartao().textContent).toContain('Beta');
    fireEvent.keyDown(screen.getByRole('button', { name: 'Próxima moto' }), { key: 'End' });
    expect(cartao().textContent).toContain('Gama');
  });

  it('não troca com o mouse sobre os controles e o cartão', () => {
    renderizarHero();
    const controles = cartao().closest('[aria-live]').parentElement;

    fireEvent.mouseEnter(controles);
    passar(INTERVALO_DO_HERO_MS * 2);
    expect(cartao().textContent).toContain('Alfa');

    fireEvent.mouseLeave(controles);
    passar(INTERVALO_DO_HERO_MS);
    expect(cartao().textContent).toContain('Beta');
  });

  it('o botão de pausa para a troca automática, e o de retomar a devolve', () => {
    renderizarHero();

    fireEvent.click(screen.getByRole('button', { name: 'Pausar troca automática' }));
    passar(INTERVALO_DO_HERO_MS * 2);
    expect(cartao().textContent).toContain('Alfa');

    fireEvent.click(screen.getByRole('button', { name: 'Retomar troca automática' }));
    passar(INTERVALO_DO_HERO_MS);
    expect(cartao().textContent).toContain('Beta');
  });

  it('clicar numa seta não para a troca automática; só reinicia a contagem', () => {
    renderizarHero();
    const proxima = screen.getByRole('button', { name: 'Próxima moto' });

    // O clique do mouse deixa o foco no botão, mas não é foco de teclado.
    proxima.focus();
    fireEvent.click(proxima);
    passar(INTERVALO_DO_HERO_MS);
    expect(cartao().textContent).toContain('Gama');
  });

  it('"Retomar" volta a trocar na hora, mesmo com o mouse sobre os controles', () => {
    renderizarHero();
    const controles = cartao().closest('[aria-live]').parentElement;

    fireEvent.click(screen.getByRole('button', { name: 'Pausar troca automática' }));
    fireEvent.mouseEnter(controles);
    fireEvent.click(screen.getByRole('button', { name: 'Retomar troca automática' }));
    passar(INTERVALO_DO_HERO_MS);
    expect(cartao().textContent).toContain('Beta');
  });

  it('com "reduzir movimento", começa pausado', () => {
    vi.stubGlobal('matchMedia', (consulta) => ({ matches: consulta.includes('reduce') }));
    renderizarHero();

    expect(screen.getByRole('button', { name: 'Retomar troca automática' })).toBeTruthy();
    passar(INTERVALO_DO_HERO_MS * 2);
    expect(cartao().textContent).toContain('Alfa');
  });

  it('a seguinte só baixa depois que a primeira chegou; as outras, quando chega a vez', () => {
    const { container } = renderizarHero();
    const fotos = () =>
      [...container.querySelectorAll('img')].map((img) => img.getAttribute('src'));

    // Enquanto a primeira (o LCP) baixa, ela está sozinha na conexão.
    expect(fotos()).toHaveLength(1);

    fireEvent.load(container.querySelector('img'));
    expect(fotos()).toHaveLength(2);
    expect(fotos().some((src) => src.includes('/c.jpg'))).toBe(false);

    passar(INTERVALO_DO_HERO_MS);
    expect(fotos().some((src) => src.includes('/c.jpg'))).toBe(true);
  });

  it('se a primeira falhar, a seguinte baixa assim mesmo', () => {
    const { container } = renderizarHero();

    fireEvent.error(container.querySelector('img'));

    expect(container.querySelectorAll('img')).toHaveLength(2);
  });

  it('desmontar o hero não deixa troca pendente', () => {
    const { unmount } = renderizarHero();
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('uma moto só: sem controles nem troca', () => {
    renderizarHero(MOTOS.slice(0, 1));

    expect(screen.queryByRole('button', { name: 'Próxima moto' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Motos em destaque' })).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('é uma região identificada como carrossel', () => {
    renderizarHero();

    const regiao = screen.getByRole('region', { name: 'Motos em destaque' });
    expect(regiao.getAttribute('aria-roledescription')).toBe('carrossel');
    expect(within(regiao).getByRole('heading', { level: 1 })).toBeTruthy();
  });
});
