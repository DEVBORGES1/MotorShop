import { useState } from 'react';

import { Modal } from '@/components/ui/Modal.jsx';
import { useArraste } from '@/hooks/useArraste.js';
import { acaoDaTecla, indiceAposAcao, indiceVizinho } from '@/utils/galeria.js';
import { atributosDeImagem } from '@/utils/imagem.js';

/**
 * Galeria da página da moto: foto principal, miniaturas e foto ampliada em
 * tela cheia.
 *
 * - **Teclado:** setas trocam a foto (na galeria e no modal), Home/End vão às
 *   pontas, `Esc` fecha o modal.
 * - **Celular:** arrastar para os lados troca a foto.
 * - **Sem salto de layout:** a área da foto tem proporção fixa antes de a
 *   imagem chegar, e `width`/`height` do cadastro vão no `<img>`.
 *
 * @param {{ imagens: Array<{id, url, alt, width?, height?}>, nome: string }} props
 */
export function MotoGallery({ imagens, nome }) {
  const [atual, setAtual] = useState(0);
  const [ampliada, setAmpliada] = useState(false);

  const total = imagens.length;
  const varias = total > 1;
  const imagem = imagens[Math.min(atual, total - 1)];

  const mover = (passo) => setAtual((indice) => indiceVizinho(indice, total, passo));
  const arraste = useArraste(mover);

  const aoTeclar = (evento) => {
    const acao = acaoDaTecla(evento.key);
    if (!acao || !varias) return;
    evento.preventDefault();
    setAtual((indice) => indiceAposAcao(acao, indice, total));
  };

  if (!total) {
    return (
      <div className="flex aspect-4/3 items-center justify-center rounded-lg border border-ink-800 bg-surface-2 text-sm text-ink-500">
        Sem fotos desta moto
      </div>
    );
  }

  const contador = varias && `Foto ${atual + 1} de ${total}`;

  return (
    // O teclado é tratado aqui também para o modal: o <dialog> é descendente
    // desta seção, e a tecla sobe até ela. Um handler no modal dobraria o passo.
    <section aria-label={`Fotos da ${nome}`} onKeyDown={aoTeclar}>
      <div className="relative aspect-4/3 overflow-hidden rounded-lg bg-surface-2">
        <button
          type="button"
          onClick={() => !arraste.foiArraste() && setAmpliada(true)}
          aria-label={`Ampliar foto${contador ? ` — ${contador}` : ''}`}
          className="block h-full w-full cursor-zoom-in touch-pan-y select-none"
          {...arraste.handlers}
        >
          {/* A foto principal é o LCP da página: sem `lazy` e com prioridade
              alta — adiá-la pioraria a métrica em vez de melhorar (§10.5). */}
          <img
            {...atributosDeImagem(imagem, 'galeria')}
            alt={imagem.alt}
            draggable={false}
            fetchPriority="high"
            decoding="async"
            className="h-full w-full object-cover"
          />
        </button>

        {varias && (
          <>
            <SetaNavegacao lado="anterior" onClick={() => mover(-1)} />
            <SetaNavegacao lado="proxima" onClick={() => mover(1)} />
            <p
              aria-live="polite"
              className="label-caps absolute right-3 bottom-3 rounded-sm bg-ink-900/80 px-2 py-1 text-[10px] text-ink-100"
            >
              {atual + 1} / {total}
              <span className="sr-only"> — {contador}</span>
            </p>
          </>
        )}
      </div>

      {varias && (
        <ul className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6">
          {imagens.map((miniatura, indice) => (
            <li key={miniatura.id}>
              <button
                type="button"
                onClick={() => setAtual(indice)}
                aria-label={`Ver foto ${indice + 1} de ${total}`}
                aria-current={indice === atual ? 'true' : undefined}
                className={`block aspect-4/3 w-full overflow-hidden rounded-md border-2 transition ${
                  indice === atual
                    ? 'border-brand-500'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img
                  {...atributosDeImagem(miniatura, 'miniatura')}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal
        aberto={ampliada}
        onClose={() => setAmpliada(false)}
        rotulo={`Fotos da ${nome}, ampliadas`}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-transparent p-0 text-ink-100"
      >
        <div className="relative flex h-full w-full items-center justify-center">
          <div
            className="flex h-full w-full touch-pan-y items-center justify-center p-4 select-none sm:p-12"
            {...arraste.handlers}
          >
            <img
              {...atributosDeImagem(imagem, 'ampliada')}
              alt={imagem.alt}
              draggable={false}
              decoding="async"
              className="max-h-full max-w-full object-contain"
            />
          </div>

          <button
            type="button"
            onClick={() => setAmpliada(false)}
            aria-label="Fechar fotos ampliadas"
            className="absolute top-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-ink-800/90 text-ink-50 hover:bg-ink-700"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4 stroke-current stroke-2">
              <path d="m3 3 10 10M13 3 3 13" />
            </svg>
          </button>

          {varias && (
            <>
              <SetaNavegacao lado="anterior" onClick={() => mover(-1)} grande />
              <SetaNavegacao lado="proxima" onClick={() => mover(1)} grande />
              <p
                aria-live="polite"
                className="label-caps absolute bottom-4 left-1/2 -translate-x-1/2 text-[11px] text-ink-200"
              >
                {contador}
              </p>
            </>
          )}
        </div>
      </Modal>
    </section>
  );
}

function SetaNavegacao({ lado, onClick, grande = false }) {
  const anterior = lado === 'anterior';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={anterior ? 'Foto anterior' : 'Próxima foto'}
      className={`absolute top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full bg-ink-900/80 text-ink-50 transition hover:bg-ink-800 ${
        anterior ? 'left-3' : 'right-3'
      } ${grande ? 'h-12 w-12' : 'h-10 w-10'}`}
    >
      <svg
        viewBox="0 0 16 16"
        aria-hidden="true"
        className="h-4 w-4 fill-none stroke-current stroke-2"
      >
        <path d={anterior ? 'M10 3 5 8l5 5' : 'm6 3 5 5-5 5'} />
      </svg>
    </button>
  );
}
