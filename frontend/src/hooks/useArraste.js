import { useRef } from 'react';

import { direcaoDoArraste } from '@/utils/galeria.js';

/**
 * Gesto de arrastar para os lados (fotos no celular).
 *
 * Usa Pointer Events, que cobrem toque, caneta e mouse com um único código.
 * O elemento precisa de `touch-action: pan-y` (`touch-pan-y`): a rolagem
 * vertical continua com o navegador, o arraste horizontal vem para cá.
 *
 * Devolve também `foiArraste()`: o `click` dispara no fim de um arraste, e sem
 * essa checagem trocar de foto também abriria a foto ampliada.
 *
 * @param {(direcao: 1 | -1) => void} onArraste
 */
export function useArraste(onArraste) {
  const inicio = useRef(null);
  const arrastou = useRef(false);

  return {
    handlers: {
      onPointerDown: (evento) => {
        inicio.current = { x: evento.clientX, y: evento.clientY };
        arrastou.current = false;
      },
      onPointerUp: (evento) => {
        if (!inicio.current) return;
        const direcao = direcaoDoArraste(
          evento.clientX - inicio.current.x,
          evento.clientY - inicio.current.y,
        );
        inicio.current = null;
        if (direcao) {
          arrastou.current = true;
          onArraste(direcao);
        }
      },
      onPointerCancel: () => {
        inicio.current = null;
      },
    },
    foiArraste: () => arrastou.current,
  };
}
