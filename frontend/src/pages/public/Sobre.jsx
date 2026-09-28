import { logoUrl } from '@motorshop/shared';
import { Link } from 'react-router-dom';

import { Localizacao } from '@/components/home/Localizacao.jsx';
import { buttonClass } from '@/components/ui/Button.jsx';
import { Revelar } from '@/components/ui/Revelar.jsx';
import { usePaginaSeo } from '@/hooks/useSeo.js';
import { useStore } from '@/hooks/useStore.js';
import { formatarTelefone } from '@/utils/format.js';
import { linkWhatsApp } from '@/utils/whatsapp.js';

const ALTURA_LOGO = 56;

/**
 * Página institucional. Todo o conteúdo vem de `GET /api/store`: é uma das
 * telas onde seria mais fácil escrever "somos a loja tal desde 2014" no
 * código — e a que mais inviabilizaria revender o produto.
 *
 * Cada bloco some sozinho quando a loja não preencheu o que ele mostra.
 */
export function Sobre() {
  const { store } = useStore();
  usePaginaSeo('sobre');
  const whatsapp = linkWhatsApp(store.contact?.whatsapp, `Olá! Vim pelo site da ${store.name}.`);

  return (
    <>
      <Abertura store={store} whatsapp={whatsapp} />
      <Diferenciais itens={store.highlights} nome={store.name} />
      <Localizacao store={store} />
      <Canais store={store} whatsapp={whatsapp} />
    </>
  );
}

function Abertura({ store, whatsapp }) {
  const local = [store.address?.city, store.address?.state].filter(Boolean).join(' · ');

  return (
    <section className="relative isolate overflow-hidden border-b border-ink-800 bg-surface">
      <div aria-hidden="true" className="fundo-brilho pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="fundo-grade pointer-events-none absolute inset-0" />

      <div className="relative mx-auto max-w-7xl px-4 pt-16 pb-16 sm:px-6 sm:pt-20 sm:pb-20">
        {store.logo?.url && (
          <img
            src={logoUrl(store.logo.url, ALTURA_LOGO * 2)}
            alt=""
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
          {local || 'Quem somos'}
        </p>

        <h1 className="mt-5 max-w-3xl text-4xl leading-[1.05] font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl">
          Sobre a {store.name}
        </h1>

        {store.slogan && <p className="mt-5 max-w-2xl text-lg text-ink-100">{store.slogan}</p>}

        <div className="mt-9 flex flex-wrap gap-3">
          <Link to="/estoque" className={buttonClass({ size: 'lg' })}>
            Ver estoque
          </Link>
          {whatsapp && (
            <a
              href={whatsapp}
              target="_blank"
              rel="noreferrer noopener"
              className={buttonClass({ variant: 'secondary', size: 'lg' })}
            >
              Falar com a loja
              <span className="sr-only"> (abre em nova aba)</span>
            </a>
          )}
        </div>
      </div>

      <div aria-hidden="true" className="faixa-listra absolute inset-x-0 top-0 h-1.5" />
    </section>
  );
}

/**
 * Diferenciais da loja, das Configurações — promessas que cada loja faz ou não.
 * Sem nenhum configurado, o bloco não aparece.
 */
function Diferenciais({ itens, nome }) {
  if (!itens?.length) return null;

  return (
    <section aria-labelledby="diferenciais" className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <Revelar>
        <p aria-hidden="true" className="label-caps mb-2 text-[11px] text-brand-500">
          Nosso jeito de trabalhar
        </p>
        <h2
          id="diferenciais"
          className="titulo-traco text-2xl font-extrabold tracking-tight sm:text-3xl"
        >
          Por que escolher a {nome}
        </h2>
      </Revelar>

      <ul className="mt-8 grid gap-0.5 overflow-hidden rounded-lg bg-ink-800 md:grid-cols-3">
        {itens.map(({ title, text }, indice) => (
          <li key={title} className="bg-surface p-6 sm:p-7">
            <Revelar atraso={indice * 120}>
              <span
                aria-hidden="true"
                className="font-display text-3xl font-extrabold text-brand-500/40"
              >
                {String(indice + 1).padStart(2, '0')}
              </span>
              <h3 className="label-caps mt-3 text-[13px] text-ink-50">{title}</h3>
              {text && <p className="mt-2.5 text-sm text-ink-400">{text}</p>}
            </Revelar>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Fecho da página: os canais diretos, para quem já se decidiu a falar com a loja. */
function Canais({ store, whatsapp }) {
  const telefone = store.contact?.phone;
  const email = store.contact?.email;

  return (
    <section
      aria-labelledby="fale-conosco"
      className="mx-auto max-w-7xl px-4 pt-4 pb-16 sm:px-6 sm:pb-20"
    >
      <Revelar className="relative isolate overflow-hidden rounded-lg border border-ink-800 bg-surface p-6 sm:p-10">
        <div
          aria-hidden="true"
          className="fundo-grade pointer-events-none absolute inset-0 -z-10 opacity-70"
        />
        <p className="label-caps text-[11px] text-brand-500">Fale com a gente</p>
        <h2
          id="fale-conosco"
          className="mt-2 max-w-xl text-2xl font-extrabold tracking-tight sm:text-3xl"
        >
          Ficou com alguma dúvida?
        </h2>
        <p className="mt-2 max-w-md text-sm text-ink-200">
          Escolha o canal que for melhor para você.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {whatsapp && (
            <a
              href={whatsapp}
              target="_blank"
              rel="noreferrer noopener"
              className={buttonClass({ size: 'lg' })}
            >
              Chamar no WhatsApp
              <span className="sr-only"> (abre em nova aba)</span>
            </a>
          )}
          <Link to="/contato" className={buttonClass({ variant: 'secondary', size: 'lg' })}>
            Enviar mensagem
          </Link>
        </div>

        {(telefone || email) && (
          <ul className="mt-6 flex flex-wrap gap-x-8 gap-y-2 border-t border-ink-800 pt-5 text-sm">
            {telefone && (
              <li>
                <a
                  href={`tel:${telefone.replace(/\D/g, '')}`}
                  className="text-ink-200 hover:text-brand-500"
                >
                  {formatarTelefone(telefone)}
                </a>
              </li>
            )}
            {email && (
              <li>
                <a href={`mailto:${email}`} className="text-ink-200 hover:text-brand-500">
                  {email}
                </a>
              </li>
            )}
          </ul>
        )}
      </Revelar>
    </section>
  );
}
