import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

/**
 * Preparação comum dos testes do frontend.
 *
 * Sem `globals`, a Testing Library não desmonta sozinha entre os testes: um
 * componente de um teste ficaria na tela do seguinte.
 */
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// O jsdom não implementa o que o navegador tem e alguns componentes usam.
if (typeof window !== 'undefined') {
  // <dialog> (Modal): abrir/fechar só alterna o atributo `open`.
  const dialogo = window.HTMLDialogElement?.prototype;
  if (dialogo && !dialogo.showModal) {
    dialogo.showModal = function showModal() {
      this.setAttribute('open', '');
    };
    dialogo.close = function close() {
      this.removeAttribute('open');
    };
  }
  window.scrollTo = () => {};
  window.HTMLElement.prototype.scrollIntoView = () => {};
}
