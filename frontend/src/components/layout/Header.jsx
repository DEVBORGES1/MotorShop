import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

import { buttonClass } from '@/components/ui/Button.jsx';
import { useStore } from '@/hooks/useStore.js';
import { linkWhatsApp } from '@/utils/whatsapp.js';

/**
 * Cabeçalho do site público.
 *
 * O menu lista apenas rotas que existem — e, entre as de módulo, só as que a
 * loja ligou: menu que leva a lugar nenhum é pior que menu curto.
 */

const LINKS = [
  { to: '/estoque', label: 'Estoque' },
  { to: '/financiamento', label: 'Financiamento', modulo: 'financingEnabled' },
  { to: '/venda-sua-moto', label: 'Venda sua moto', modulo: 'sellMotoEnabled' },
  { to: '/sobre', label: 'Sobre' },
  { to: '/contato', label: 'Contato' },
];

export function Header() {
  const { store } = useStore();
  const [aberto, setAberto] = useState(false);
  const links = LINKS.filter((link) => !link.modulo || store.features?.[link.modulo]);
  const { pathname } = useLocation();

  // Navegar fecha o menu: no celular ele cobre a tela, e ficar aberto sobre a
  // página nova parece travamento.
  useEffect(() => setAberto(false), [pathname]);

  const whatsapp = linkWhatsApp(store.contact?.whatsapp, `Olá! Vim pelo site da ${store.name}.`);
  const classeLink = ({ isActive }) =>
    `label-caps text-[13px] transition ${isActive ? 'text-brand-500' : 'text-ink-100 hover:text-brand-500'}`;

  return (
    <header className="sticky top-0 z-50 border-b border-ink-800 bg-ink-900/95 backdrop-blur">
      {/* Altura mínima fixa: o botão de WhatsApp e o logo só existem depois que
          a configuração da loja chega, e sem ela o cabeçalho cresceria nesse
          instante, empurrando a página inteira (salto de layout). */}
      <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-6 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-3">
          {store.logo?.url ? (
            <img src={store.logo.url} alt={store.name} className="h-11 w-auto" />
          ) : (
            <span className="font-display text-xl font-extrabold tracking-tight text-ink-50">
              {store.name}
            </span>
          )}
        </Link>

        <nav className="ml-auto hidden items-center gap-7 md:flex">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} className={classeLink}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4 md:ml-0">
          {store.contact?.phone && (
            <div className="hidden text-right lg:block">
              {store.address?.city && (
                <div className="label-caps text-[10px] font-medium text-ink-500">
                  {[store.address.city, store.address.state].filter(Boolean).join(' · ')}
                </div>
              )}
              <a
                href={`tel:${store.contact.phone.replace(/\D/g, '')}`}
                className="font-display text-[15px] font-bold text-ink-50"
              >
                {store.contact.phone}
              </a>
            </div>
          )}

          {whatsapp && (
            <a
              href={whatsapp}
              target="_blank"
              rel="noreferrer noopener"
              className={buttonClass({ className: 'hidden sm:inline-flex' })}
            >
              WhatsApp
            </a>
          )}

          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            aria-expanded={aberto}
            aria-controls="menu-principal"
            className="rounded-md border border-ink-700 px-3 py-2 text-ink-100 md:hidden"
          >
            <span className="sr-only">{aberto ? 'Fechar menu' : 'Abrir menu'}</span>
            <span aria-hidden="true">{aberto ? '✕' : '☰'}</span>
          </button>
        </div>
      </div>

      {aberto && (
        <nav id="menu-principal" className="border-t border-ink-800 px-4 py-3 md:hidden">
          <ul className="flex flex-col">
            {links.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  className={({ isActive }) => `${classeLink({ isActive })} block py-3`}
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
            {whatsapp && (
              <li className="pt-3">
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={buttonClass({ className: 'w-full sm:hidden' })}
                >
                  WhatsApp
                </a>
              </li>
            )}
          </ul>
        </nav>
      )}
    </header>
  );
}
