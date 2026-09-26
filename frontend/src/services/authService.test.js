// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from './api.js';
import * as authService from './authService.js';

vi.mock('./api.js', () => ({ api: { post: vi.fn(), get: vi.fn() }, setAccessToken: vi.fn() }));

const sessao = { data: { accessToken: 't', user: { name: 'Dono' } } };

/**
 * A marca "alguém da equipe já entrou neste navegador" decide se o site
 * público tenta restaurar a sessão. Visitante comum: nunca tem a marca, e o
 * site não faz nenhuma requisição de sessão por ele.
 */
describe('marca de entrada da equipe', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.get).mockReset();
  });

  it('visitante que nunca entrou não tem a marca', () => {
    expect(authService.jaEntrouNesteNavegador()).toBe(false);
  });

  it('login marca; logout desmarca, mesmo se a API falhar', async () => {
    vi.mocked(api.post).mockResolvedValueOnce(sessao);
    await authService.login({ email: 'a@b.c', password: 'x' });
    expect(authService.jaEntrouNesteNavegador()).toBe(true);

    vi.mocked(api.post).mockRejectedValueOnce(new Error('fora do ar'));
    await expect(authService.logout()).rejects.toThrow();
    expect(authService.jaEntrouNesteNavegador()).toBe(false);
  });

  it('sessão restaurada mantém a marca; sessão vencida a apaga', async () => {
    vi.mocked(api.post).mockResolvedValueOnce(sessao);
    await authService.restoreSession();
    expect(authService.jaEntrouNesteNavegador()).toBe(true);

    vi.mocked(api.post).mockRejectedValueOnce(new Error('Sessão expirada'));
    await expect(authService.restoreSession()).rejects.toThrow('Sessão expirada');
    expect(authService.jaEntrouNesteNavegador()).toBe(false);
  });

  it('armazenamento bloqueado não quebra nada — só não há atalhos', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(authService.jaEntrouNesteNavegador()).toBe(false);
    getItem.mockRestore();
  });

  it('consulta do site: sessão viva mantém a marca; sem sessão, a marca é esquecida', async () => {
    localStorage.setItem('motorshop:equipe', '1');

    vi.mocked(api.get).mockResolvedValueOnce({ data: { name: 'Dono', role: 'SUPER_ADMIN' } });
    expect(await authService.consultarSessao()).toEqual({ name: 'Dono', role: 'SUPER_ADMIN' });
    expect(authService.jaEntrouNesteNavegador()).toBe(true);
    expect(api.get).toHaveBeenCalledWith('/auth/sessao');
    // Consultar nunca renova: nenhuma chamada ao refresh.
    expect(api.post).not.toHaveBeenCalled();

    vi.mocked(api.get).mockResolvedValueOnce({ data: null });
    expect(await authService.consultarSessao()).toBeNull();
    expect(authService.jaEntrouNesteNavegador()).toBe(false);
  });
});
