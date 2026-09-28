import { logoUrl } from '@motorshop/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { buttonClass } from '@/components/ui/Button.jsx';
import { formatarPreco } from '@/utils/format.js';
import { acaoDaTecla, indiceAposAcao, indiceVizinho } from '@/utils/galeria.js';
import { atributosDeImagem, imagemPrincipal, nomeDaMoto } from '@/utils/imagem.js';
import { caminhoDaMoto } from '@/utils/moto.js';

const ALTURA_LOGO = 56;

/** Tempo de cada moto na tela: dá para ler o cartão sem a troca parecer lenta. */
export const INTERVALO_DO_HERO_MS = 7000;

/**
 * Abertura da home: fotos de motos do estoque ocupam a largura toda e trocam
 * sozinhas, com logo, slogan e chamadas fixos por cima e a moto da foto
 * identificada num cartão no canto. Só a foto e o cartão trocam — o texto
 * nunca some da frente de quem está lendo.
 *
 * A troca automática para com o mouse ou o foco do teclado nos controles (a
 * moto não muda sob o clique), pelo botão de pausa e, com "reduzir movimento"
 * ligado, já começa pausada. Setas, pontos e as setas do teclado trocam à mão, e cada
 * troca reinicia a contagem.
 *
 * Sem foto (loja nova), o fundo fica por conta da grade, do brilho e da listra
 * no acento.
 *
 * @param {{ motos?: object[] }} props `motos`: as das fotos, todas com foto
 */
export function Hero({ store, total, whatsapp, motos = [] }) {
  const contato = whatsapp(`Olá! Vim pelo site da ${store.name}.`);
  const local = [store.address?.city, store.address?.state].filter(Boolean).join(' · ');

  const quantidade = motos.length;
  const varias = quantidade > 1;
  const [atual, setAtual] = useState(0);
  // Fotos montadas: as que já apareceram, a atual e a seguinte. As demais só
  // baixam perto da vez delas, para não disputar banda com a primeira (o LCP).
  const [montadas, setMontadas] = useState(() => new Set([0]));
  const [pausadoPeloBotao, setPausadoPeloBotao] = useState(false);
  const [emUso, setEmUso] = useState(false);
  const primeiraFoto = useRef(null);

  // A lista cresce enquanto destaques, ofertas e recentes chegam; o índice
  // nunca aponta para fora dela.
  const indice = Math.min(atual, Math.max(quantidade - 1, 0));
  const moto = motos[indice] ?? null;
  const rodando = varias && !pausadoPeloBotao && !emUso;

  const montar = useCallback(
    (...indices) =>
      setMontadas((antes) =>
        indices.every((i) => antes.has(i)) ? antes : new Set([...antes, ...indices]),
      ),
    [],
  );

  const irPara = useCallback(
    (novo) => {
      setAtual(novo);
      montar(novo, indiceVizinho(novo, quantidade, 1));
    },
    [quantidade, montar],
  );

  // A segunda foto só começa a baixar quando a primeira chegou: antes disso,
  // mesmo com prioridade baixa, ela dividiria a conexão com a foto do LCP.
  // Pode já ter chegado antes da hidratação (veio pré-anunciada no HTML), e aí
  // o evento `load` não dispara mais — por isso o `complete`.
  useEffect(() => {
    const foto = primeiraFoto.current;
    if (!varias || !foto) return undefined;
    if (foto.complete) {
      montar(1);
      return undefined;
    }
    const aoTerminar = () => montar(1);
    foto.addEventListener('load', aoTerminar, { once: true });
    foto.addEventListener('error', aoTerminar, { once: true });
    return () => {
      foto.removeEventListener('load', aoTerminar);
      foto.removeEventListener('error', aoTerminar);
    };
  }, [varias, montar]);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setPausadoPeloBotao(true);
    }
  }, []);

  // Um timeout por moto, refeito a cada troca: a troca à mão reinicia a
  // contagem, e desmontar o hero limpa o que estiver pendente.
  useEffect(() => {
    if (!rodando) return undefined;
    const espera = setTimeout(
      () => irPara(indiceVizinho(indice, quantidade, 1)),
      INTERVALO_DO_HERO_MS,
    );
    return () => clearTimeout(espera);
  }, [rodando, indice, quantidade, irPara]);

  return (
    <section
      aria-label={varias ? 'Motos em destaque' : undefined}
      aria-roledescription={varias ? 'carrossel' : undefined}
      className="relative isolate overflow-hidden border-b border-ink-800 bg-surface"
    >
      {moto ? (
        <>
          {motos.map(
            (item, i) =>
              montadas.has(i) && (
                <FotoDeFundo
                  key={item.id ?? item.slug}
                  ref={i === 0 ? primeiraFoto : undefined}
                  foto={imagemPrincipal(item)}
                  visivel={i === indice}
                  principal={i === 0}
                />
              ),
          )}
          <VeuSobreAFoto />
        </>
      ) : (
        <>
          <div aria-hidden="true" className="fundo-brilho pointer-events-none absolute inset-0" />
          <div aria-hidden="true" className="fundo-grade pointer-events-none absolute inset-0" />
        </>
      )}

      <div
        className={`relative mx-auto flex max-w-7xl flex-col justify-center px-4 pt-16 pb-28 sm:px-6 sm:pt-20 sm:pb-32 ${
          moto ? 'min-h-[34rem] lg:min-h-[40rem]' : ''
        }`}
      >
        {store.logo?.url && (
          // Sem `width`: a imagem entregue vem sem a margem do arquivo (ver `logoUrl`).
          <img
            src={logoUrl(store.logo.url)}
            alt={store.name}
            height={ALTURA_LOGO}
            className="mb-8 w-auto max-w-full self-start object-contain object-left"
            style={{ height: ALTURA_LOGO }}
          />
        )}

        <p className="label-caps flex items-center gap-3 text-[11px] text-brand-500">
          <span aria-hidden="true" className="h-0.5 w-8 bg-brand-500" />
          {local || 'Motos'}
        </p>

        <h1 className="mt-5 max-w-3xl text-4xl leading-[1.05] font-extrabold tracking-tight text-balance sm:text-6xl lg:text-7xl">
          {store.slogan || 'Sua próxima moto está aqui.'}
        </h1>

        <p className="mt-5 max-w-xl text-lg text-ink-100">
          Estoque atualizado, com fotos, ficha e preço de cada moto.
        </p>

        <div className="mt-9 flex flex-wrap gap-3">
          <Link to="/estoque" className={buttonClass({ size: 'lg' })}>
            Ver estoque{total ? ` · ${total} motos` : ''}
          </Link>
          {contato && (
            <a
              href={contato}
              target="_blank"
              rel="noreferrer noopener"
              className={buttonClass({ variant: 'secondary', size: 'lg' })}
            >
              <IconeWhatsApp />
              Falar no WhatsApp
            </a>
          )}
        </div>

        {moto && (
          <div
            className="mt-10 flex flex-col items-start gap-3 lg:absolute lg:right-6 lg:bottom-20 lg:mt-0 lg:items-end"
            onMouseEnter={() => setEmUso(true)}
            onMouseLeave={() => setEmUso(false)}
            // Só o foco do teclado: o clique do mouse também deixa o foco no
            // botão, e aí um clique numa seta pararia a troca de vez.
            onFocus={(evento) => {
              if (evento.target.matches(':focus-visible')) setEmUso(true);
            }}
            onBlur={(evento) => {
              if (!evento.currentTarget.contains(evento.relatedTarget)) setEmUso(false);
            }}
            onKeyDown={(evento) => {
              const acao = acaoDaTecla(evento.key);
              if (!acao || !varias) return;
              evento.preventDefault();
              irPara(indiceAposAcao(acao, indice, quantidade));
            }}
          >
            {varias && (
              <Controles
                motos={motos}
                indice={indice}
                irPara={irPara}
                pausado={pausadoPeloBotao}
                alternarPausa={() => {
                  setPausadoPeloBotao((pausado) => !pausado);
                  // "Retomar" vale na hora, mesmo com o mouse ou o foco ali.
                  setEmUso(false);
                }}
              />
            )}
            {/* Anuncia a moto nova só quando a troca foi pedida — anunciar a
                cada troca automática atropelaria o leitor de tela. */}
            <div aria-live={rodando ? 'off' : 'polite'} className="max-w-full">
              <MotoDaFoto moto={moto} />
            </div>
          </div>
        )}
      </div>

      <div aria-hidden="true" className="faixa-listra absolute inset-x-0 top-0 h-1.5" />
    </section>
  );
}

/**
 * Uma foto de fundo. As montadas ficam empilhadas e só a da vez aparece; a
 * troca de opacidade faz a passagem de uma para a outra.
 */
function FotoDeFundo({ foto, visivel, principal, ref }) {
  const atributos = atributosDeImagem(foto, 'ampliada');

  return (
    <img
      ref={ref}
      {...atributos}
      // Ocupa a tela toda, em qualquer largura.
      sizes={atributos.srcSet ? '100vw' : undefined}
      alt=""
      // Nada de `lazy`: a foto seguinte está montada justamente para já estar
      // baixada quando chegar a vez dela, e o navegador adia a `lazy` que está
      // escondida atrás da atual — a troca mostraria o fundo vazio.
      loading="eager"
      fetchPriority={principal ? 'high' : 'low'}
      decoding="async"
      className={`absolute inset-0 -z-10 h-full w-full object-cover object-[65%_center] transition-opacity duration-1000 ease-in-out motion-reduce:transition-none ${
        visivel ? 'opacity-100' : 'opacity-0'
      }`}
    />
  );
}

/**
 * Véu escuro para o texto ler bem por cima da foto: forte onde está o texto (à
 * esquerda no computador, embaixo no celular) e aberto para a moto aparecer.
 */
function VeuSobreAFoto() {
  return (
    <>
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-linear-to-t from-ink-900/95 via-ink-900/75 to-ink-900/60 lg:bg-linear-to-r lg:from-ink-900/95 lg:via-ink-900/70 lg:to-ink-900/10"
      />
      {/* Costura com a faixa de busca logo abaixo. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-linear-to-t from-ink-900 to-transparent"
      />
    </>
  );
}

/** Setas, um ponto por moto e o botão de pausa. */
function Controles({ motos, indice, irPara, pausado, alternarPausa }) {
  const quantidade = motos.length;
  const botao =
    'flex h-9 w-9 items-center justify-center rounded-full text-ink-50 transition hover:bg-ink-800 hover:text-brand-500';

  return (
    <div className="flex items-center gap-1 rounded-full border border-ink-700 bg-ink-900/85 p-1 backdrop-blur">
      <button
        type="button"
        onClick={() => irPara(indiceVizinho(indice, quantidade, -1))}
        aria-label="Moto anterior"
        className={botao}
      >
        <Seta anterior />
      </button>

      <ul className="flex items-center">
        {motos.map((item, i) => (
          <li key={item.id ?? item.slug}>
            <button
              type="button"
              onClick={() => irPara(i)}
              aria-label={`Ver moto ${i + 1} de ${quantidade}: ${nomeDaMoto(item)}`}
              aria-current={i === indice ? 'true' : undefined}
              className="group flex h-9 w-6 items-center justify-center"
            >
              <span
                aria-hidden="true"
                className={`block h-1.5 rounded-full transition-all motion-reduce:transition-none ${
                  i === indice ? 'w-4 bg-brand-500' : 'w-1.5 bg-ink-400 group-hover:bg-ink-100'
                }`}
              />
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => irPara(indiceVizinho(indice, quantidade, 1))}
        aria-label="Próxima moto"
        className={botao}
      >
        <Seta />
      </button>

      <button
        type="button"
        onClick={alternarPausa}
        aria-label={pausado ? 'Retomar troca automática' : 'Pausar troca automática'}
        className={botao}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5 fill-current">
          {pausado ? <path d="M4 2.5v11L13 8z" /> : <path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" />}
        </svg>
      </button>
    </div>
  );
}

function Seta({ anterior = false }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="h-4 w-4 fill-none stroke-current stroke-2"
    >
      <path d={anterior ? 'M10 3 5 8l5 5' : 'm6 3 5 5-5 5'} />
    </svg>
  );
}

/** Identifica a moto da foto e leva à página dela. */
function MotoDaFoto({ moto }) {
  return (
    <Link
      to={caminhoDaMoto(moto.slug)}
      className="group flex w-fit max-w-full items-center gap-4 rounded-lg border border-ink-700 bg-ink-900/85 px-4 py-3 backdrop-blur transition hover:border-brand-500"
    >
      <span>
        <span className="label-caps block text-[10px] text-ink-400">Na foto</span>
        <span className="block font-bold text-ink-50">{nomeDaMoto(moto)}</span>
      </span>
      <span className="font-display text-lg font-extrabold text-brand-500">
        {formatarPreco(moto.price)}
      </span>
      <span
        aria-hidden="true"
        className="text-brand-500 transition group-hover:translate-x-0.5 motion-reduce:transition-none"
      >
        →
      </span>
    </Link>
  );
}

function IconeWhatsApp() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current">
      <path d="M12.04 2a9.9 9.9 0 0 0-8.5 14.95L2 22l5.2-1.5A9.9 9.9 0 1 0 12.04 2Zm0 1.8a8.1 8.1 0 1 1-4.3 14.98l-.3-.19-3.08.89.9-3-.2-.31A8.1 8.1 0 0 1 12.04 3.8Zm-3.2 4.1c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1s.9 2.44 1.03 2.6c.13.17 1.77 2.83 4.36 3.85 2.15.85 2.59.68 3.06.64.47-.04 1.5-.61 1.71-1.2.21-.6.21-1.1.15-1.2-.06-.11-.23-.17-.48-.3-.25-.13-1.5-.74-1.73-.82-.23-.09-.4-.13-.57.12-.17.25-.65.82-.8.99-.15.17-.3.19-.55.06-.25-.13-1.07-.4-2.03-1.25-.75-.67-1.26-1.5-1.4-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.3.38-.44.13-.15.17-.25.25-.42.08-.17.04-.32-.02-.44-.06-.13-.55-1.4-.78-1.9-.2-.47-.4-.4-.57-.41h-.48Z" />
    </svg>
  );
}
