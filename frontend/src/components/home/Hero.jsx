import { logoUrl } from '@motorshop/shared';
import { Link } from 'react-router-dom';

import { buttonClass } from '@/components/ui/Button.jsx';
import { formatarPreco } from '@/utils/format.js';
import { atributosDeImagem, imagemPrincipal, nomeDaMoto } from '@/utils/imagem.js';
import { caminhoDaMoto } from '@/utils/moto.js';

const ALTURA_LOGO = 56;

/** Motos com foto, no máximo 3 — é o que cabe no mosaico. */
export function motosParaMosaico(...listas) {
  const vistas = new Set();
  const escolhidas = [];

  for (const moto of listas.flat()) {
    if (!moto || vistas.has(moto.id ?? moto.slug) || !imagemPrincipal(moto)) continue;
    vistas.add(moto.id ?? moto.slug);
    escolhidas.push(moto);
    if (escolhidas.length === 3) break;
  }

  return escolhidas;
}

/**
 * Abertura da home: logo, slogan e chamadas à esquerda; à direita, um mosaico
 * com as motos em destaque. Sem fotos (loja nova), o texto ocupa a largura toda
 * e a identidade fica por conta da grade, do brilho e da listra no acento.
 */
export function Hero({ store, total, whatsapp, motos }) {
  const contato = whatsapp(`Olá! Vim pelo site da ${store.name}.`);
  const local = [store.address?.city, store.address?.state].filter(Boolean).join(' · ');

  return (
    <section className="relative overflow-hidden border-b border-ink-800 bg-surface">
      <div aria-hidden="true" className="fundo-brilho pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="fundo-grade pointer-events-none absolute inset-0" />

      <div
        className={`relative mx-auto grid max-w-7xl items-center gap-10 px-4 pt-14 pb-24 sm:px-6 sm:pt-20 sm:pb-28 ${
          motos.length ? 'lg:grid-cols-12' : ''
        }`}
      >
        <div className={motos.length ? 'lg:col-span-7' : ''}>
          {store.logo?.url && (
            <img
              src={logoUrl(store.logo.url, ALTURA_LOGO * 2)}
              alt={store.name}
              width={
                store.logo.height
                  ? Math.round((ALTURA_LOGO * store.logo.width) / store.logo.height)
                  : undefined
              }
              height={ALTURA_LOGO}
              className="mb-8 w-auto"
              style={{ height: ALTURA_LOGO }}
            />
          )}

          <p className="label-caps flex items-center gap-3 text-[11px] text-brand-500">
            <span aria-hidden="true" className="h-0.5 w-8 bg-brand-500" />
            {local || 'Motos'}
          </p>

          <h1 className="mt-5 max-w-3xl text-4xl leading-[1.05] font-extrabold tracking-tight text-balance sm:text-6xl">
            {store.slogan || 'Sua próxima moto está aqui.'}
          </h1>

          <p className="mt-5 max-w-xl text-lg text-ink-200">
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
        </div>

        {motos.length > 0 && <Mosaico motos={motos} />}
      </div>

      <div aria-hidden="true" className="faixa-listra absolute inset-x-0 top-0 h-1.5" />
    </section>
  );
}

/** Uma foto grande e até duas menores, cada uma levando à página da moto. */
function Mosaico({ motos }) {
  return (
    <ul className="grid grid-cols-2 gap-2 lg:col-span-5" aria-label="Motos em destaque">
      {motos.map((moto, indice) => (
        <li key={moto.id ?? moto.slug} className={indice === 0 ? 'col-span-2' : undefined}>
          <FotoDoMosaico moto={moto} grande={indice === 0} />
        </li>
      ))}
    </ul>
  );
}

function FotoDoMosaico({ moto, grande }) {
  const foto = imagemPrincipal(moto);
  const atributos = atributosDeImagem(foto, grande ? 'galeria' : 'card');
  const tamanhos = grande ? '(min-width: 1024px) 40vw, 100vw' : '(min-width: 1024px) 20vw, 50vw';

  return (
    <Link
      to={caminhoDaMoto(moto.slug)}
      className={`group relative block overflow-hidden rounded-lg border border-ink-700 bg-surface-2 ${
        grande ? 'aspect-16/10' : 'aspect-4/3'
      }`}
    >
      <img
        {...atributos}
        sizes={atributos.srcSet ? tamanhos : undefined}
        alt=""
        loading={grande ? 'eager' : 'lazy'}
        fetchPriority={grande ? 'high' : undefined}
        decoding="async"
        className="zoom-foto h-full w-full object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-linear-to-t from-ink-900/90 via-transparent to-transparent"
      />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3 sm:p-4">
        <span className="text-sm font-bold text-ink-50 sm:text-base">{nomeDaMoto(moto)}</span>
        <span className="font-display text-sm font-extrabold whitespace-nowrap text-brand-500 sm:text-base">
          {formatarPreco(moto.price)}
        </span>
      </div>
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
