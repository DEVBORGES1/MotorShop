import { USER_ROLE } from '@motorshop/shared';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/Button.jsx';
import { useAuth } from '@/hooks/useAuth.js';
import { useStore } from '@/hooks/useStore.js';
import { iniciais } from '@/utils/format.js';

/**
 * Casca do painel administrativo.
 *
 * Barra lateral em vez do menu superior anterior: o painel cresce por telas
 * (motos, marcas, usuários, configurações, e leads na FASE 6), e uma linha
 * horizontal de abas quebra quando a sexta entra. A lateral também deixa o
 * topo livre para as ações da tela.
 *
 * No celular a lateral vira gaveta sobre a página, porque 232px fixos de um
 * lado não sobram em 390px de largura.
 */

const LINKS = [
  { to: '/admin', label: 'Painel', end: true },
  { to: '/admin/leads', label: 'Leads' },
  { to: '/admin/motos', label: 'Motos' },
  { to: '/admin/marcas', label: 'Marcas' },
  { to: '/admin/usuarios', label: 'Usuários', apenasSuperAdmin: true },
  { to: '/admin/configuracoes', label: 'Configurações' },
];

export function AdminLayout() {
  const { user, signOut } = useAuth();
  const { store } = useStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [gavetaAberta, setGavetaAberta] = useState(false);

  // Navegar fecha a gaveta: no celular ela cobre a página, e continuar aberta
  // sobre a tela nova parece que o clique não funcionou.
  useEffect(() => setGavetaAberta(false), [pathname]);

  const sair = async () => {
    await signOut();
    navigate('/admin/login', { replace: true });
  };

  const visiveis = LINKS.filter(
    (link) => !link.apenasSuperAdmin || user?.role === USER_ROLE.SUPER_ADMIN,
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      {/* Fundo que fecha a gaveta ao toque, só no celular. */}
      {gavetaAberta && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setGavetaAberta(false)}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[232px] flex-col gap-6 border-r border-ink-800 bg-[#0D0F0D] p-4 transition-transform lg:static lg:translate-x-0 ${
          gavetaAberta ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <Link to="/admin" className="font-display text-base font-extrabold text-ink-50">
            {store.name}
            <span className="label-caps ml-2 text-[10px] text-ink-500">admin</span>
          </Link>
          <button
            type="button"
            onClick={() => setGavetaAberta(false)}
            className="rounded-md px-2 py-1 text-ink-400 lg:hidden"
          >
            <span className="sr-only">Fechar menu</span>
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        <nav className="flex flex-col gap-0.5">
          {visiveis.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `label-caps rounded-md px-3 py-2.5 text-[11px] transition ${
                  isActive
                    ? 'bg-brand-500/12 text-brand-500'
                    : 'text-ink-400 hover:bg-ink-800 hover:text-ink-100'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto border-t border-ink-800 pt-4">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-xs font-extrabold text-brand-500"
            >
              {iniciais(user?.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-bold text-ink-50">{user?.name}</p>
              <p className="label-caps text-[10px] text-ink-500">{user?.role}</p>
            </div>
          </div>

          <Button variant="secondary" size="sm" onClick={sair} className="mt-4 w-full">
            Sair
          </Button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="flex items-center gap-3 border-b border-ink-800 bg-[#0D0F0D] px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => setGavetaAberta(true)}
            aria-expanded={gavetaAberta}
            className="rounded-md border border-ink-700 px-3 py-2 text-ink-100 lg:hidden"
          >
            <span className="sr-only">Abrir menu</span>
            <span aria-hidden="true">☰</span>
          </button>

          <Link
            to="/"
            className="label-caps ml-auto text-[11px] text-ink-400 transition hover:text-brand-500"
          >
            Ver o site
          </Link>
        </header>

        <main className="flex-1 px-4 py-7 sm:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
