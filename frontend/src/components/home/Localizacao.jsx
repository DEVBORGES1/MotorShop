import { useState } from 'react';

import { buttonClass } from '@/components/ui/Button.jsx';
import { Revelar } from '@/components/ui/Revelar.jsx';
import { useSituacaoDaLoja } from '@/hooks/useSituacaoDaLoja.js';
import {
  cidadeLinha,
  enderecoLinha,
  horariosAgrupados,
  urlDeRota,
  urlDoMapaIncorporado,
} from '@/utils/loja.js';

/**
 * Onde fica a loja: endereço, se está aberta agora, horários e mapa.
 *
 * Tudo vem das Configurações; o que a loja não preencheu não aparece, e sem
 * endereço nem horário o bloco inteiro some.
 */
export function Localizacao({ store }) {
  const endereco = enderecoLinha(store.address);
  const cidade = cidadeLinha(store.address);
  const horarios = horariosAgrupados(store.businessHours);
  const rota = urlDeRota(store.address);
  const mapa = urlDoMapaIncorporado(store.address);

  if (!endereco && !cidade && !horarios.length) return null;

  return (
    <section aria-labelledby="onde-estamos" className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <Revelar>
        <p aria-hidden="true" className="label-caps mb-2 text-[11px] text-brand-500">
          Visite a loja
        </p>
        <h2
          id="onde-estamos"
          className="titulo-traco text-2xl font-extrabold tracking-tight sm:text-3xl"
        >
          Onde estamos
        </h2>
      </Revelar>

      <div className="mt-8 grid gap-5 lg:grid-cols-5">
        <Revelar className="rounded-lg border border-ink-800 bg-surface p-6 sm:p-7 lg:col-span-2">
          {(endereco || cidade) && (
            <address className="text-ink-200 not-italic">
              {endereco && <div className="text-lg font-bold text-ink-50">{endereco}</div>}
              {cidade && <div className="mt-0.5 text-sm text-ink-400">{cidade}</div>}
            </address>
          )}

          <SituacaoDaLoja businessHours={store.businessHours} />

          {horarios.length > 0 && (
            <dl className="mt-5 space-y-2 border-t border-ink-800 pt-5 text-sm">
              {horarios.map(({ dias, horario }) => (
                <div key={dias} className="flex justify-between gap-6">
                  <dt className="text-ink-400">{dias}</dt>
                  <dd className={horario ? 'text-ink-100' : 'text-ink-500'}>
                    {horario ?? 'Fechado'}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {rota && (
            <a
              href={rota}
              target="_blank"
              rel="noreferrer noopener"
              className={buttonClass({ className: 'mt-6 w-full sm:w-auto' })}
            >
              Como chegar
              <span className="sr-only"> (abre em nova aba)</span>
            </a>
          )}
        </Revelar>

        {mapa && (
          <Revelar atraso={120} className="lg:col-span-3">
            <MapaSobDemanda src={mapa} endereco={endereco} />
          </Revelar>
        )}
      </div>
    </section>
  );
}

function SituacaoDaLoja({ businessHours }) {
  const situacao = useSituacaoDaLoja(businessHours);
  if (!situacao) return null;

  return (
    <p
      className={`mt-4 inline-flex items-center gap-2 text-sm font-bold ${
        situacao.aberto ? 'text-ok' : 'text-ink-200'
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-2.5 w-2.5 rounded-full ${situacao.aberto ? 'bg-ok' : 'bg-ink-500'}`}
      />
      {situacao.texto}
    </p>
  );
}

/**
 * Mapa que só carrega quando o visitante pede. Incorporar o mapa do Google já
 * na abertura entregaria o acesso de todo visitante a um terceiro (LGPD) e
 * pesaria a home; com o clique, quem quer o mapa o vê e quem não quer não
 * paga por ele.
 */
function MapaSobDemanda({ src, endereco }) {
  const [carregado, setCarregado] = useState(false);

  if (carregado) {
    return (
      <iframe
        title={`Mapa da loja${endereco ? `: ${endereco}` : ''}`}
        src={src}
        loading="lazy"
        referrerPolicy="strict-origin"
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        className="h-80 w-full rounded-lg border border-ink-700 bg-surface-2 lg:h-full lg:min-h-96"
      />
    );
  }

  return (
    <div className="relative flex h-80 flex-col items-center justify-center gap-4 overflow-hidden rounded-lg border border-ink-800 bg-surface p-6 text-center lg:h-full lg:min-h-96">
      <div aria-hidden="true" className="fundo-grade pointer-events-none absolute inset-0" />
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="relative h-12 w-12 fill-none stroke-brand-500"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" />
        <circle cx="12" cy="9.5" r="2.5" />
      </svg>
      <button
        type="button"
        onClick={() => setCarregado(true)}
        className={buttonClass({ variant: 'secondary', size: 'lg', className: 'relative' })}
      >
        Ver mapa
      </button>
      <p className="relative max-w-xs text-xs text-ink-400">
        Ao abrir o mapa, o Google recebe o seu acesso a esta página.
      </p>
    </div>
  );
}
