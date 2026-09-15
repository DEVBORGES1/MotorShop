import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/Button.jsx';
import { useAuth } from '@/hooks/useAuth.js';

const LINKS = [
  { to: '/admin', label: 'Painel', end: true },
  { to: '/admin/motos', label: 'Motos' },
  { to: '/admin/marcas', label: 'Marcas' },
  { to: '/admin/usuarios', label: 'Usuários', superAdminOnly: true },
  { to: '/admin/configuracoes', label: 'Configurações' },
];

export function AdminLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const sair = async () => {
    await signOut();
    navigate('/admin/login', { replace: true });
  };

  const visiveis = LINKS.filter((link) => !link.superAdminOnly || user?.role === 'SUPER_ADMIN');

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-ink-800 bg-ink-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <span className="text-base font-bold tracking-tight">
              Motor<span className="text-brand-500">Shop</span>
              <span className="ml-2 text-xs font-normal text-ink-400">admin</span>
            </span>

            <nav className="flex flex-wrap gap-1">
              {visiveis.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-1.5 text-sm transition ${
                      isActive ? 'bg-ink-800 text-ink-50' : 'text-ink-400 hover:text-ink-200'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span className="text-ink-400">{user?.name}</span>
            <Button variant="secondary" onClick={sair}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
