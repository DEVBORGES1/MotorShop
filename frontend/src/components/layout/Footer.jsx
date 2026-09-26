import { Link } from 'react-router-dom';

import { useStore } from '@/hooks/useStore.js';
import { formatarTelefone } from '@/utils/format.js';
import { cidadeLinha, enderecoLinha, horariosAgrupados } from '@/utils/loja.js';

const REDES = [
  ['instagram', 'Instagram'],
  ['facebook', 'Facebook'],
  ['youtube', 'YouTube'],
];

export function Footer() {
  const { store } = useStore();
  const horarios = horariosAgrupados(store.businessHours);
  const endereco = enderecoLinha(store.address);
  const cidade = cidadeLinha(store.address);
  const redes = REDES.filter(([chave]) => store.social?.[chave]);

  return (
    <footer className="mt-20 border-t border-ink-800 bg-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <p className="font-display text-lg font-extrabold text-ink-50">{store.name}</p>
          {store.slogan && <p className="mt-2 max-w-xs text-sm text-ink-400">{store.slogan}</p>}
          {(endereco || cidade) && (
            <address className="mt-4 text-sm text-ink-400 not-italic">
              {endereco && <div>{endereco}</div>}
              {cidade && <div>{cidade}</div>}
            </address>
          )}
        </div>

        <nav aria-label="Rodapé">
          <h2 className="label-caps text-[11px] text-ink-500">Loja</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link to="/estoque" className="text-ink-200 hover:text-brand-500">
                Estoque
              </Link>
            </li>
            <li>
              <Link to="/sobre" className="text-ink-200 hover:text-brand-500">
                Sobre a loja
              </Link>
            </li>
            <li>
              <Link to="/contato" className="text-ink-200 hover:text-brand-500">
                Contato
              </Link>
            </li>
            <li>
              <Link to="/privacidade" className="text-ink-200 hover:text-brand-500">
                Privacidade
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          {horarios.length > 0 && (
            <>
              <h2 className="label-caps text-[11px] text-ink-500">Horários</h2>
              <dl className="mt-4 space-y-2 text-sm">
                {horarios.map(({ dias, horario }) => (
                  <div key={dias} className="flex justify-between gap-4">
                    <dt className="text-ink-400">{dias}</dt>
                    <dd className={horario ? 'text-ink-200' : 'text-ink-500'}>
                      {horario ?? 'Fechado'}
                    </dd>
                  </div>
                ))}
              </dl>
            </>
          )}

          {(store.contact?.phone || store.contact?.email) && (
            <ul className="mt-6 space-y-2 text-sm">
              {store.contact.phone && (
                <li>
                  <a
                    href={`tel:${store.contact.phone.replace(/\D/g, '')}`}
                    className="text-ink-200 hover:text-brand-500"
                  >
                    {formatarTelefone(store.contact.phone)}
                  </a>
                </li>
              )}
              {store.contact.email && (
                <li>
                  <a
                    href={`mailto:${store.contact.email}`}
                    className="text-ink-200 hover:text-brand-500"
                  >
                    {store.contact.email}
                  </a>
                </li>
              )}
            </ul>
          )}

          {redes.length > 0 && (
            <ul className="mt-6 flex gap-4 text-sm">
              {redes.map(([chave, rotulo]) => (
                <li key={chave}>
                  <a
                    href={store.social[chave]}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-ink-200 hover:text-brand-500"
                  >
                    {rotulo}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="border-t border-ink-800">
        {/* Folga à direita e embaixo: o botão flutuante do WhatsApp fica fixo
            nesse canto e cobriria a última linha do rodapé. */}
        <p className="mx-auto max-w-7xl px-4 py-5 pr-20 pb-20 text-xs text-ink-500 sm:px-6 sm:pr-24">
          © {new Date().getFullYear()} {store.name}
        </p>
      </div>
    </footer>
  );
}
