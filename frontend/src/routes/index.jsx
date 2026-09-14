import { createBrowserRouter } from 'react-router-dom';

import { RootLayout } from '@/layouts/RootLayout.jsx';
import { Home } from '@/pages/Home.jsx';
import { NotFound } from '@/pages/NotFound.jsx';

/**
 * Mapa de rotas da aplicação. As rotas públicas restantes e o bloco /admin
 * (carregado sob demanda) entram nas FASES 3 e 4.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
