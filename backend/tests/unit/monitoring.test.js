import { describe, expect, it, vi } from 'vitest';

import { errorHandler } from '../../src/middlewares/errorHandler.js';
import * as monitoring from '../../src/config/monitoring.js';
import { ApiError } from '../../src/utils/ApiError.js';

describe('monitoramento de erros', () => {
  it('não manda dado pessoal: sem cabeçalhos, corpo, query, IP nem usuário', () => {
    const evento = monitoring.scrubEvent({
      request: {
        method: 'POST',
        url: 'https://loja.test/api/leads?utm_source=x',
        headers: { authorization: 'Bearer token', cookie: 'motorshop_refresh=abc' },
        data: '{"phone":"+5549999998888"}',
        env: { REMOTE_ADDR: '200.1.2.3' },
      },
      user: { ip_address: '200.1.2.3' },
      exception: { values: [{ type: 'Error' }] },
    });

    expect(evento.request).toEqual({ method: 'POST', url: 'https://loja.test/api/leads' });
    expect(evento).not.toHaveProperty('user');
    expect(evento.exception).toBeTruthy();
  });

  it('sem DSN (e em teste) fica desligado', () => {
    expect(monitoring.initMonitoring()).toBe(false);
  });

  const responder = () => {
    const res = { status: vi.fn(() => res), json: vi.fn() };
    return res;
  };

  it('erro inesperado (500) é enviado, com o requestId', () => {
    const captura = vi.spyOn(monitoring, 'captureError');
    const erro = new Error('conexão caiu');

    errorHandler(erro, { id: 'req-1', path: '/api/motos' }, responder(), () => {});

    expect(captura).toHaveBeenCalledWith(erro, { requestId: 'req-1', path: '/api/motos' });
  });

  it('erro do cliente (4xx) não é enviado', () => {
    const captura = vi.spyOn(monitoring, 'captureError');

    errorHandler(new ApiError(422, 'Dados inválidos'), { id: 'req-2' }, responder(), () => {});

    expect(captura).not.toHaveBeenCalled();
  });
});
