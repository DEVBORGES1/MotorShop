import { AuthProvider } from '@/contexts/AuthContext.jsx';
import { DadosIniciaisProvider } from '@/contexts/DadosIniciaisContext.jsx';
import { StoreProvider } from '@/contexts/StoreContext.jsx';

/**
 * Provedores comuns ao navegador e ao servidor. O roteador entra como filho:
 * `RouterProvider` no navegador, `StaticRouterProvider` no servidor.
 *
 * @param {{ dados: object, children: React.ReactNode }} props
 *   `dados`: os dados de partida (`DadosIniciaisContext`).
 */
export function App({ dados, children }) {
  return (
    <DadosIniciaisProvider dados={dados}>
      <AuthProvider>
        <StoreProvider>{children}</StoreProvider>
      </AuthProvider>
    </DadosIniciaisProvider>
  );
}
