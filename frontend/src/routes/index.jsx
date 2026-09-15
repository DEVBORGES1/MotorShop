import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';

import { RequireAuth } from '@/components/admin/RequireAuth.jsx';
import { RootLayout } from '@/layouts/RootLayout.jsx';
import { NotFound } from '@/pages/NotFound.jsx';
import { Home } from '@/pages/public/Home.jsx';

/** Quem chega pela home não baixa o código do estoque antes de clicar nele. */
const Estoque = lazy(() =>
  import('@/pages/public/Estoque.jsx').then((m) => ({ default: m.Estoque })),
);
const Sobre = lazy(() => import('@/pages/public/Sobre.jsx').then((m) => ({ default: m.Sobre })));
const Contato = lazy(() =>
  import('@/pages/public/Contato.jsx').then((m) => ({ default: m.Contato })),
);

/**
 * O bloco administrativo é carregado sob demanda.
 *
 * Um visitante do site público nunca baixa o código do painel: além do peso
 * evitado, é uma superfície a menos exposta a quem só veio ver motos.
 */
const AdminLayout = lazy(() =>
  import('@/layouts/AdminLayout.jsx').then((m) => ({ default: m.AdminLayout })),
);
const Login = lazy(() => import('@/pages/admin/Login.jsx').then((m) => ({ default: m.Login })));
const Dashboard = lazy(() =>
  import('@/pages/admin/Dashboard.jsx').then((m) => ({ default: m.Dashboard })),
);
const MotosList = lazy(() =>
  import('@/pages/admin/MotosList.jsx').then((m) => ({ default: m.MotosList })),
);
const MotoForm = lazy(() =>
  import('@/pages/admin/MotoForm.jsx').then((m) => ({ default: m.MotoForm })),
);
const Marcas = lazy(() => import('@/pages/admin/Marcas.jsx').then((m) => ({ default: m.Marcas })));
const Usuarios = lazy(() =>
  import('@/pages/admin/Usuarios.jsx').then((m) => ({ default: m.Usuarios })),
);
const Configuracoes = lazy(() =>
  import('@/pages/admin/Configuracoes.jsx').then((m) => ({ default: m.Configuracoes })),
);

const carregando = <div className="p-8 text-ink-400">Carregando…</div>;
const comSuspense = (elemento) => <Suspense fallback={carregando}>{elemento}</Suspense>;

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'estoque', element: comSuspense(<Estoque />) },
      { path: 'sobre', element: comSuspense(<Sobre />) },
      { path: 'contato', element: comSuspense(<Contato />) },
      { path: '*', element: <NotFound /> },
    ],
  },

  // Login fora do layout administrativo: quem não entrou ainda não tem menu.
  { path: '/admin/login', element: comSuspense(<Login />) },

  {
    path: '/admin',
    element: comSuspense(<RequireAuth />),
    children: [
      {
        element: comSuspense(<AdminLayout />),
        children: [
          { index: true, element: comSuspense(<Dashboard />) },
          { path: 'motos', element: comSuspense(<MotosList />) },
          { path: 'motos/nova', element: comSuspense(<MotoForm />) },
          { path: 'motos/:id/editar', element: comSuspense(<MotoForm />) },
          { path: 'marcas', element: comSuspense(<Marcas />) },
          { path: 'configuracoes', element: comSuspense(<Configuracoes />) },
          {
            // Gestão de usuários é exclusiva de SUPER_ADMIN, espelhando a API.
            element: <RequireAuth roles={['SUPER_ADMIN']} />,
            children: [{ path: 'usuarios', element: comSuspense(<Usuarios />) }],
          },
        ],
      },
    ],
  },
]);
