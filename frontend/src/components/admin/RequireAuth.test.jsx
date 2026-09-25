// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Login } from '@/pages/admin/Login.jsx';
import * as authService from '@/services/authService.js';
import { DONO, renderizar, VENDEDOR } from '@/test/renderizar.jsx';

import { RequireAuth } from './RequireAuth.jsx';

vi.mock('@/services/authService.js', () => ({
  restoreSession: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
}));

/** Painel protegido de mentira: /admin (qualquer admin) e /admin/usuarios (só dono). */
function painel(rota, opcoes = {}) {
  return renderizar(<RequireAuth />, {
    rota,
    caminho: '/admin',
    outrasRotas: [
      { path: '/admin/login', element: <Login /> },
      {
        path: '/admin/usuarios',
        element: <RequireAuth roles={['SUPER_ADMIN']} />,
        children: [{ index: true, element: <p>Gestão de usuários</p> }],
      },
      {
        path: '/admin/leads',
        element: <RequireAuth />,
        children: [{ index: true, element: <p>Lista de leads</p> }],
      },
    ],
    ...opcoes,
  });
}

describe('RequireAuth e login', () => {
  beforeEach(() => {
    authService.restoreSession.mockRejectedValue(new Error('Sessão inválida'));
  });

  it('sem sessão, manda para o login', async () => {
    painel('/admin/leads');

    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeTruthy();
    expect(screen.queryByText('Lista de leads')).toBeNull();
  });

  it('sessão válida restaurada pelo cookie: mostra a página pedida', async () => {
    authService.restoreSession.mockResolvedValue(VENDEDOR);
    painel('/admin/leads');

    expect(await screen.findByText('Lista de leads')).toBeTruthy();
    expect(authService.restoreSession).toHaveBeenCalledTimes(1);
  });

  it('papel insuficiente: acesso negado (a API também recusa — isto é só a tela)', () => {
    painel('/admin/usuarios', { usuario: VENDEDOR });

    expect(screen.getByText('Acesso negado')).toBeTruthy();
    expect(screen.queryByText('Gestão de usuários')).toBeNull();
  });

  it('SUPER_ADMIN entra na área restrita', () => {
    painel('/admin/usuarios', { usuario: DONO });

    expect(screen.getByText('Gestão de usuários')).toBeTruthy();
  });

  it('login volta para a página que a pessoa tentou abrir', async () => {
    authService.login.mockResolvedValue(VENDEDOR);
    const { user, router } = painel('/admin/leads');

    await user.type(await screen.findByLabelText(/E-mail/), 'ana@loja.test');
    await user.type(screen.getByLabelText(/Senha/), 'chave-forte-2026');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Lista de leads')).toBeTruthy();
    expect(router.state.location.pathname).toBe('/admin/leads');
    expect(authService.login).toHaveBeenCalledWith({
      email: 'ana@loja.test',
      password: 'chave-forte-2026',
    });
  });

  it('login recusado mostra a mensagem do servidor e não entra', async () => {
    authService.login.mockRejectedValue(new Error('E-mail ou senha inválidos'));
    const { user } = painel('/admin/login');

    await user.type(await screen.findByLabelText(/E-mail/), 'ana@loja.test');
    await user.type(screen.getByLabelText(/Senha/), 'errada');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('E-mail ou senha inválidos')).toBeTruthy();
  });

  it('login valida os campos antes de chamar a API', async () => {
    const { user } = painel('/admin/login');

    await user.click(await screen.findByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Informe o e-mail')).toBeTruthy();
    expect(screen.getByText('Informe a senha')).toBeTruthy();
    expect(authService.login).not.toHaveBeenCalled();
  });
});
