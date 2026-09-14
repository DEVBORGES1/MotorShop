import { Link, Outlet } from 'react-router-dom';

/**
 * Casca comum das páginas públicas. O cabeçalho definitivo (menu, busca,
 * WhatsApp) pertence à FASE 4.
 */
export function RootLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-ink-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-lg font-bold tracking-tight">
            Motor<span className="text-brand-500">Shop</span>
          </Link>
          <span className="text-xs text-ink-400">FASE 1 — fundação</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <Outlet />
      </main>

      <footer className="border-t border-ink-800">
        <div className="mx-auto max-w-5xl px-4 py-6 text-xs text-ink-400">
          MotorShop — plataforma para lojas de motos.
        </div>
      </footer>
    </div>
  );
}
