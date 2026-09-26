// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Revelar } from './Revelar.jsx';

const ESCONDIDO = 'opacity-0';

describe('Revelar', () => {
  let observadores;

  beforeEach(() => {
    observadores = [];
    globalThis.IntersectionObserver = class {
      constructor(callback) {
        this.callback = callback;
        this.disconnect = vi.fn();
        observadores.push(this);
      }
      observe() {}
    };
    window.matchMedia = vi.fn(() => ({ matches: false }));
    // O jsdom não tem layout: tudo estaria em top = 0, "à vista". Aqui ele fica abaixo da tela.
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ top: 5000 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete globalThis.IntersectionObserver;
  });

  it('bloco abaixo da tela espera, e aparece quando entra nela', () => {
    render(<Revelar>conteúdo</Revelar>);
    const bloco = screen.getByText('conteúdo');

    expect(bloco.className).toContain(ESCONDIDO);

    act(() => observadores[0].callback([{ isIntersecting: true }]));

    expect(bloco.className).not.toContain(ESCONDIDO);
    expect(observadores[0].disconnect).toHaveBeenCalled();
  });

  it('não reage a um cruzamento que não é entrada na tela', () => {
    render(<Revelar>conteúdo</Revelar>);

    act(() => observadores[0].callback([{ isIntersecting: false }]));

    expect(screen.getByText('conteúdo').className).toContain(ESCONDIDO);
  });

  it('bloco já à vista na primeira pintura não é escondido (nada de piscar)', () => {
    Element.prototype.getBoundingClientRect.mockReturnValue({ top: 100 });
    render(<Revelar>conteúdo</Revelar>);

    expect(screen.getByText('conteúdo').className).not.toContain(ESCONDIDO);
    expect(observadores).toHaveLength(0);
  });

  it('com "reduzir movimento", o conteúdo nunca é escondido', () => {
    window.matchMedia = vi.fn(() => ({ matches: true }));
    render(<Revelar>conteúdo</Revelar>);

    expect(screen.getByText('conteúdo').className).not.toContain(ESCONDIDO);
    expect(observadores).toHaveLength(0);
  });

  it('sem IntersectionObserver, o conteúdo fica visível', () => {
    delete globalThis.IntersectionObserver;
    render(<Revelar>conteúdo</Revelar>);

    expect(screen.getByText('conteúdo').className).not.toContain(ESCONDIDO);
  });

  it('o atraso escalona a entrada e o elemento pode ser outra tag', () => {
    render(
      <ul>
        <Revelar as="li" atraso={240}>
          item
        </Revelar>
      </ul>,
    );

    const item = screen.getByRole('listitem');
    expect(item.style.transitionDelay).toBe('240ms');
  });
});
