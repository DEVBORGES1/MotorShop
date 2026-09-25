import { lazy, Suspense, useEffect } from 'react';

import { RequireAuth } from '@/components/admin/RequireAuth.jsx';
import { RootLayout } from '@/layouts/RootLayout.jsx';
import { NotFound } from '@/pages/NotFound.jsx';
import { Home } from '@/pages/public/Home.jsx';

import { carregarMotoDetalhe } from './carregadores.js';

/** Quem chega pela home não baixa o código do estoque antes de clicar nele. */
const Estoque = lazy(() =>
  import('@/pages/public/Estoque.jsx').then((m) => ({ default: m.Estoque })),
);
const MotoDetalhe = lazy(() => carregarMotoDetalhe().then((m) => ({ default: m.MotoDetalhe })));
const Financiamento = lazy(() =>
  import('@/pages/public/Financiamento.jsx').then((m) => ({ default: m.Financiamento })),
);
const VendaSuaMoto = lazy(() =>
  import('@/pages/public/VendaSuaMoto.jsx').then((m) => ({ default: m.VendaSuaMoto })),
);
const Privacidade = lazy(() =>
  import('@/pages/public/Privacidade.jsx').then((m) => ({ default: m.Privacidade })),
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
const Leads = lazy(() => import('@/pages/admin/Leads.jsx').then((m) => ({ default: m.Leads })));
const Configuracoes = lazy(() =>
  import('@/pages/admin/Configuracoes.jsx').then((m) => ({ default: m.Configuracoes })),
);

// Ocupa a tela enquanto o código da página chega: com uma linha só, o rodapé
// subiria até o meio da tela e despencaria em seguida (salto de layout).
const carregando = <div className="min-h-dvh p-8 text-ink-400">Carregando…</div>;
const comSuspense = (elemento) => (
  <Suspense fallback={carregando}>
    <SinalDePronto />
    {elemento}
  </Suspense>
);

/**
 * Marca `<html data-pronto>` quando a página ficou interativa. Fica dentro do
 * mesmo Suspense da página: numa página renderizada no servidor, o efeito só
 * roda depois que o React hidratou aquele trecho — antes disso, o HTML está
 * na tela mas os botões ainda não respondem. O E2E espera por ele.
 */
function SinalDePronto() {
  useEffect(() => {
    document.documentElement.dataset.pronto = '';
  }, []);
  return null;
}

/**
 * Rotas da aplicação. Só a definição: o navegador monta com
 * `createBrowserRouter` (main.jsx) e o servidor com `createStaticRouter`
 * (entry-server.jsx) — criar o roteador aqui exigiria `window` ao importar.
 */
export const rotas = [
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: (
          <>
            <SinalDePronto />
            <Home />
          </>
        ),
      },
      { path: 'estoque', element: comSuspense(<Estoque />) },
      { path: 'motos/:slug', element: comSuspense(<MotoDetalhe />) },
      { path: 'financiamento', element: comSuspense(<Financiamento />) },
      { path: 'venda-sua-moto', element: comSuspense(<VendaSuaMoto />) },
      { path: 'privacidade', element: comSuspense(<Privacidade />) },
      { path: 'sobre', element: comSuspense(<Sobre />) },
      { path: 'contato', element: comSuspense(<Contato />) },
      {
        path: '*',
        element: (
          <>
            <SinalDePronto />
            <NotFound />
          </>
        ),
      },
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
          { path: 'leads', element: comSuspense(<Leads />) },
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
];
