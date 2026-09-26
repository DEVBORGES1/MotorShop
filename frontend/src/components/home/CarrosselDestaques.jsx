import { MOTO_STATUS } from '@motorshop/shared';
import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge.jsx';
import { formatarCilindrada, formatarKm, formatarPreco } from '@/utils/format.js';
import { atributosDeImagem, imagemPrincipal, nomeDaMoto } from '@/utils/imagem.js';
import { caminhoDaMoto } from '@/utils/moto.js';

const LIMITE_DE_SLIDES = 6;

/**
 * Motos que entram no carrossel: só as com foto, sem repetir, na ordem das
 * listas (destaques primeiro, depois ofertas, depois as mais recentes).
 */
export function motosParaCarrossel(...listas) {
  const vistas = new Set();
  const escolhidas = [];

  for (const moto of listas.flat()) {
    if (!moto || vistas.has(moto.id ?? moto.slug) || !imagemPrincipal(moto)) continue;
    vistas.add(moto.id ?? moto.slug);
    escolhidas.push(moto);
    if (escolhidas.length === LIMITE_DE_SLIDES) break;
  }

  return escolhidas;
}

const reduzMovimento = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Carrossel de destaques da abertura da home.
 *
 * O deslize é do próprio navegador (`scroll-snap`): toque, roda do mouse,
 * setas do teclado e "arrastar" funcionam sem código. O JavaScript só liga os
 * botões e os pontos à posição da rolagem. Não troca de slide sozinho: rotação
 * automática tira o foco de quem lê e exigiria botão de pausa (WCAG 2.2.2).
 */
export function CarrosselDestaques({ motos }) {
  const trilho = useRef(null);
  const [atual, setAtual] = useState(0);

  const irPara = useCallback((indice) => {
    const el = trilho.current;
    if (!el) return;
    el.scrollTo({ left: indice * el.clientWidth, behavior: reduzMovimento() ? 'auto' : 'smooth' });
  }, []);

  const aoRolar = (evento) => {
    const { scrollLeft, clientWidth } = evento.currentTarget;
    if (clientWidth) setAtual(Math.round(scrollLeft / clientWidth));
  };

  const varios = motos.length > 1;
  const ultimo = motos.length - 1;

  return (
    <section
      aria-roledescription="carrossel"
      aria-label="Motos em destaque"
      className="min-w-0 lg:col-span-5"
    >
      <ul
        ref={trilho}
        onScroll={aoRolar}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-lg border border-ink-700 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {motos.map((moto, indice) => (
          <li
            key={moto.id ?? moto.slug}
            aria-roledescription="slide"
            aria-label={`${indice + 1} de ${motos.length}`}
            className="w-full shrink-0 snap-center"
          >
            <Slide moto={moto} prioridade={indice === 0} />
          </li>
        ))}
      </ul>

      {varios && (
        <div className="mt-3 flex items-center justify-between gap-4">
          <ul className="flex items-center gap-1">
            {motos.map((moto, indice) => (
              <li key={moto.id ?? moto.slug}>
                <button
                  type="button"
                  onClick={() => irPara(indice)}
                  aria-label={`Ir para ${nomeDaMoto(moto)}`}
                  aria-current={indice === atual ? 'true' : undefined}
                  // Alvo de toque de 24 px (WCAG 2.5.8) com o ponto desenhado dentro.
                  className="group flex h-6 w-6 items-center justify-center"
                >
                  <span
                    className={`block h-1.5 rounded-full transition-all ${
                      indice === atual
                        ? 'w-6 bg-brand-500'
                        : 'w-1.5 bg-ink-600 group-hover:bg-ink-400'
                    }`}
                  />
                </button>
              </li>
            ))}
          </ul>

          <div className="flex gap-2">
            <SetaDoCarrossel
              rotulo="Moto anterior"
              disabled={atual <= 0}
              onClick={() => irPara(atual - 1)}
              caminho="M15 5l-7 7 7 7"
            />
            <SetaDoCarrossel
              rotulo="Próxima moto"
              disabled={atual >= ultimo}
              onClick={() => irPara(atual + 1)}
              caminho="M9 5l7 7-7 7"
            />
          </div>
        </div>
      )}
    </section>
  );
}

function SetaDoCarrossel({ rotulo, caminho, ...props }) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      className="flex h-10 w-10 items-center justify-center rounded-md border border-ink-700 text-ink-100 transition hover:border-brand-500 hover:text-brand-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-ink-700 disabled:hover:text-ink-100"
      {...props}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5 fill-none stroke-current"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={caminho} />
      </svg>
    </button>
  );
}

function Slide({ moto, prioridade }) {
  const foto = imagemPrincipal(moto);
  const atributos = atributosDeImagem(foto, 'galeria');
  const reservada = moto.status === MOTO_STATUS.RESERVED;
  const emOferta = moto.onSale && moto.previousPrice > moto.price;
  const detalhes = [moto.year, formatarKm(moto.mileage), formatarCilindrada(moto.engineCapacity)]
    .filter(Boolean)
    .join(' · ');

  return (
    <Link
      to={caminhoDaMoto(moto.slug)}
      className="group relative block aspect-4/3 overflow-hidden bg-surface-2 sm:aspect-16/10"
    >
      <img
        {...atributos}
        sizes={atributos.srcSet ? '(min-width: 1024px) 40vw, 100vw' : undefined}
        alt=""
        // Só o primeiro slide compete pela largura de banda da abertura.
        loading={prioridade ? 'eager' : 'lazy'}
        fetchPriority={prioridade ? 'high' : undefined}
        decoding="async"
        draggable={false}
        className="zoom-foto h-full w-full object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-linear-to-t from-ink-900/95 via-ink-900/20 to-transparent"
      />

      {(reservada || emOferta || moto.featured) && (
        <div className="absolute top-3 left-3 flex gap-1.5">
          {reservada && <Badge tone="warn">Reservada</Badge>}
          {emOferta && <Badge tone="brand">Oferta</Badge>}
          {!emOferta && moto.featured && <Badge tone="neutral">Destaque</Badge>}
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
        <span className="block text-lg font-extrabold text-ink-50 sm:text-xl">
          {nomeDaMoto(moto)}
        </span>
        {detalhes && <span className="mt-0.5 block text-xs text-ink-200">{detalhes}</span>}
        <span className="mt-2 flex flex-wrap items-baseline gap-2">
          {emOferta && (
            <span className="text-sm text-ink-400 line-through">
              {formatarPreco(moto.previousPrice)}
            </span>
          )}
          <span className="font-display text-2xl font-extrabold text-brand-500">
            {formatarPreco(moto.price)}
          </span>
        </span>
      </div>
    </Link>
  );
}
