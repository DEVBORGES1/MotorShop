// @vitest-environment jsdom
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@/contexts/AuthContext.jsx';
import { AdminLayout } from '@/layouts/AdminLayout.jsx';
import { leadsAdmin, marcasAdmin, motosAdmin } from '@/services/adminService.js';
import { DONO, pagina, renderizar, VENDEDOR } from '@/test/renderizar.jsx';

import { Dashboard } from './Dashboard.jsx';

vi.mock('@/services/adminService.js', () => ({
  motosAdmin: { list: vi.fn() },
  marcasAdmin: { list: vi.fn() },
  leadsAdmin: { list: vi.fn() },
}));

const TOTAIS = { AVAILABLE: 7, RESERVED: 2, SOLD: 5, INACTIVE: 1 };

describe('painel inicial', () => {
  beforeEach(() => {
    motosAdmin.list.mockImplementation(async ({ status }) => pagina([], { total: TOTAIS[status] }));
    marcasAdmin.list.mockResolvedValue([{ id: 'b1' }, { id: 'b2' }]);
    leadsAdmin.list.mockResolvedValue(pagina([], { total: 3 }));
  });

  it('conta as motos por status sem baixar as motos (limit 1, total do meta)', async () => {
    renderizar(<Dashboard />, { usuario: VENDEDOR });

    expect(await screen.findByText('15 motos no total')).toBeTruthy();
    expect(screen.getByText('2 marcas')).toBeTruthy();
    for (const chamada of motosAdmin.list.mock.calls) expect(chamada[0].limit).toBe(1);
  });

  it('lead novo aparece primeiro, com atalho para a lista filtrada', async () => {
    renderizar(<Dashboard />, { usuario: VENDEDOR });

    const aviso = await screen.findByRole('link', { name: /3 leads novos aguardando/ });
    expect(aviso.getAttribute('href')).toBe('/admin/leads?status=NEW');
  });

  it('sem lead novo, sem aviso', async () => {
    leadsAdmin.list.mockResolvedValue(pagina([], { total: 0 }));
    renderizar(<Dashboard />, { usuario: VENDEDOR });

    await screen.findByText('15 motos no total');
    expect(screen.queryByText(/aguardando/)).toBeNull();
  });
});

describe('menu do painel', () => {
  it('ADMIN não vê "Usuários"; o dono vê', () => {
    const vendedor = renderizar(<AdminLayout />, { rota: '/admin', usuario: VENDEDOR });
    expect(screen.queryByRole('link', { name: 'Usuários' })).toBeNull();
    expect(screen.getAllByRole('link', { name: 'Leads' }).length).toBeGreaterThan(0);
    vendedor.unmount();

    renderizar(<AdminLayout />, { rota: '/admin', usuario: DONO });
    expect(screen.getAllByRole('link', { name: 'Usuários' }).length).toBeGreaterThan(0);
  });

  it('sair encerra a sessão e volta ao login', async () => {
    const signOut = vi.fn().mockResolvedValue();
    const { user, router } = renderizar(
      <AuthContext.Consumer>
        {(sessao) => (
          <AuthContext.Provider value={{ ...sessao, signOut }}>
            <AdminLayout />
          </AuthContext.Provider>
        )}
      </AuthContext.Consumer>,
      {
        rota: '/admin',
        usuario: DONO,
        outrasRotas: [{ path: '/admin/login', element: <p>Tela de login</p> }],
      },
    );

    await user.click(screen.getAllByRole('button', { name: 'Sair' })[0]);

    expect(signOut).toHaveBeenCalled();
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/login'));
  });
});
