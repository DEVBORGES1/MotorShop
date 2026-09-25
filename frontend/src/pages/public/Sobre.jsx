import { buttonClass } from '@/components/ui/Button.jsx';
import { usePaginaSeo } from '@/hooks/useSeo.js';
import { useStore } from '@/hooks/useStore.js';
import { cidadeLinha, enderecoLinha, horariosAgrupados } from '@/utils/loja.js';
import { linkWhatsApp } from '@/utils/whatsapp.js';

/**
 * Página institucional. Todo o conteúdo vem de `GET /api/store`: é uma das
 * telas onde seria mais fácil escrever "somos a loja tal desde 2014" no
 * código — e a que mais inviabilizaria revender o produto.
 */
export function Sobre() {
  const { store } = useStore();
  usePaginaSeo('sobre');
  const horarios = horariosAgrupados(store.businessHours);
  const endereco = enderecoLinha(store.address);
  const cidade = cidadeLinha(store.address);
  const whatsapp = linkWhatsApp(store.contact?.whatsapp, `Olá! Vim pelo site da ${store.name}.`);

  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Sobre a {store.name}</h1>
      {store.slogan && <p className="mt-4 text-lg text-ink-200">{store.slogan}</p>}

      <div className="mt-12 grid gap-10 sm:grid-cols-2">
        {(endereco || cidade) && (
          <section>
            <h2 className="label-caps text-[11px] text-ink-500">Onde estamos</h2>
            <address className="mt-4 text-sm text-ink-200 not-italic">
              {endereco && <div>{endereco}</div>}
              {cidade && <div className="text-ink-400">{cidade}</div>}
            </address>
            {store.address?.mapsUrl && (
              <a
                href={store.address.mapsUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-3 inline-block text-sm text-brand-500 hover:underline"
              >
                Abrir no mapa
              </a>
            )}
          </section>
        )}

        {horarios.length > 0 && (
          <section>
            <h2 className="label-caps text-[11px] text-ink-500">Horários</h2>
            <dl className="mt-4 space-y-2 text-sm">
              {horarios.map(({ dias, horario }) => (
                <div key={dias} className="flex justify-between gap-6">
                  <dt className="text-ink-400">{dias}</dt>
                  <dd className={horario ? 'text-ink-200' : 'text-ink-500'}>
                    {horario ?? 'Fechado'}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </div>

      {whatsapp && (
        <a
          href={whatsapp}
          target="_blank"
          rel="noreferrer noopener"
          className={buttonClass({ size: 'lg', className: 'mt-12' })}
        >
          Falar com a loja
        </a>
      )}
    </div>
  );
}
