// @vitest-environment jsdom
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as authService from '@/services/authService.js';
import { DONO, renderizar } from '@/test/renderizar.jsx';

import { RootLayout } from './RootLayout.jsx';

vi.mock('@/services/authService.js', () => ({
  jaEntrouNesteNavegador: vi.fn(),
  esquecerEntrada: vi.fn(),
  consultarSessao: vi.fn(),
  restoreSession: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
}));

const site = () => renderizar(<RootLayout />, { caminho: '*' });

describe('site público: acesso da equipe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authService.logout.mockResolvedValue();
  });

  it('visitante comum: ícone leva ao login, sem faixa e sem nenhuma chamada de sessão', () => {
    authService.jaEntrouNesteNavegador.mockReturnValue(false);
    site();

    const icone = screen.getByRole('link', { name: 'Área da equipe da loja' });
    expect(icone.getAttribute('href')).toBe('/admin/login');
    expect(screen.queryByText(/Conectado como/)).toBeNull();
    // O motivo da marca: visitante não dispara nenhuma chamada de sessão.
    expect(authService.consultarSessao).not.toHaveBeenCalled();
    expect(authService.restoreSession).not.toHaveBeenCalled();
  });

  it('equipe que já entrou neste navegador: faixa com o nome, Painel, e o ícone vai ao painel', async () => {
    authService.jaEntrouNesteNavegador.mockReturnValue(true);
    authService.consultarSessao.mockResolvedValue(DONO);
    site();

    expect(await screen.findByText('Dono da Loja')).toBeTruthy();
    const faixa = screen.getByRole('navigation', { name: 'Acesso da equipe' });
    expect(faixa.querySelector('a').getAttribute('href')).toBe('/admin');
    expect(screen.getByRole('link', { name: 'Painel da loja' }).getAttribute('href')).toBe(
      '/admin',
    );
    // O site só consulta: a renovação (que troca o token) fica para o painel.
    expect(authService.restoreSession).not.toHaveBeenCalled();
  });

  it('Sair na faixa encerra a sessão e o site volta ao modo visitante', async () => {
    authService.jaEntrouNesteNavegador.mockReturnValue(true);
    authService.consultarSessao.mockResolvedValue(DONO);
    const { user } = site();

    await user.click(await screen.findByRole('button', { name: 'Sair' }));

    expect(authService.logout).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByText(/Conectado como/)).toBeNull());
    expect(screen.getByRole('link', { name: 'Área da equipe da loja' })).toBeTruthy();
  });

  it('marca antiga com sessão vencida: nada de faixa, o site segue normal', async () => {
    authService.jaEntrouNesteNavegador.mockReturnValue(true);
    authService.consultarSessao.mockResolvedValue(null);
    site();

    await waitFor(() => expect(authService.consultarSessao).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/Conectado como/)).toBeNull();
  });
});
