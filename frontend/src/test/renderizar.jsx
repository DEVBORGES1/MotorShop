import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

import { AuthContext, AuthProvider } from '@/contexts/AuthContext.jsx';
import { DadosIniciaisProvider } from '@/contexts/DadosIniciaisContext.jsx';
import { StoreProvider } from '@/contexts/StoreContext.jsx';

/** Loja de teste: todos os módulos ligados e financiamento configurado. */
export const LOJA = Object.freeze({
  name: 'Loja Teste',
  legalName: 'Loja Teste Ltda',
  slogan: 'Motos revisadas',
  contact: { whatsapp: '49999990000', phone: '4935550000', email: 'contato@loja.test' },
  address: { street: 'Rua das Motos', number: '10', city: 'Chapecó', state: 'SC' },
  businessHours: [{ weekday: 1, opensAt: '08:00', closesAt: '18:00', closed: false }],
  social: {},
  seo: {},
  theme: { primary: '#4CD62B' },
  features: { financingEnabled: true, sellMotoEnabled: true },
  financing: { monthlyRate: 1.79, installmentOptions: [12, 24, 36, 48], minDownPaymentPercent: 20 },
  configured: true,
});

export const DONO = Object.freeze({ id: 'u1', name: 'Dono da Loja', role: 'SUPER_ADMIN' });
export const VENDEDOR = Object.freeze({ id: 'u2', name: 'Ana Vendas', role: 'ADMIN' });

/** Moto como a API pública devolve. */
export function motoDeTeste(extra = {}) {
  return {
    id: 'm1',
    slug: 'honda-cb-500f-2024',
    brand: { name: 'Honda', slug: 'honda' },
    model: 'CB 500F',
    version: null,
    year: 2024,
    mileage: 4200,
    engineCapacity: 471,
    fuel: 'GASOLINE',
    transmission: 'MANUAL',
    color: 'Vermelha',
    price: 38900,
    status: 'AVAILABLE',
    images: [],
    features: [],
    description: 'Única dona.',
    ...extra,
  };
}

/**
 * Renderiza uma tela com os mesmos provedores da aplicação (dados iniciais,
 * sessão, loja) e um roteador em memória.
 *
 * @param {React.ReactNode} elemento
 * @param {object} [opcoes]
 * @param {string} [opcoes.rota] URL inicial
 * @param {string} [opcoes.caminho] padrão de rota do elemento (`/motos/:slug`)
 * @param {Array} [opcoes.outrasRotas] rotas extras, para conferir navegação
 * @param {object} [opcoes.usuario] sessão já aberta (`DONO`, `VENDEDOR`);
 *   sem ele, a sessão real (`AuthProvider`), que começa deslogada
 */
export function renderizar(
  elemento,
  { rota = '/', caminho = '*', outrasRotas = [], store = LOJA, usuario, dados = {} } = {},
) {
  const router = createMemoryRouter([{ path: caminho, element: elemento }, ...outrasRotas], {
    initialEntries: [rota],
  });

  const conteudo = (
    <StoreProvider>
      <RouterProvider router={router} />
    </StoreProvider>
  );

  const sessao = usuario ? (
    <AuthContext.Provider
      value={{
        user: usuario,
        isAuthenticated: true,
        membroDaEquipe: usuario,
        isRestoring: false,
        verificarSessao: () => {},
        verificarSessaoSeJaEntrou: () => {},
        signIn: async () => usuario,
        signOut: async () => {},
      }}
    >
      {conteudo}
    </AuthContext.Provider>
  ) : (
    <AuthProvider>{conteudo}</AuthProvider>
  );

  const tela = render(
    <DadosIniciaisProvider dados={{ store, origem: 'https://loja.test', ...dados }}>
      {sessao}
    </DadosIniciaisProvider>,
  );

  return { ...tela, router, user: userEvent.setup() };
}

/** Envelope de lista como a API devolve (`data` + `meta` de paginação). */
export const pagina = (itens, extra = {}) => ({
  success: true,
  data: itens,
  meta: { page: 1, limit: 20, total: itens.length, totalPages: 1, ...extra },
});
