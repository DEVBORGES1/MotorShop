import { describe, expect, it } from 'vitest';

import { ApiClientError, normalizeApiError } from './api.js';

describe('normalizeApiError', () => {
  it('usa a mensagem enviada pela API quando há resposta', () => {
    const error = normalizeApiError({
      response: { status: 404, data: { message: 'Moto não encontrada', errors: [] } },
    });

    expect(error).toBeInstanceOf(ApiClientError);
    expect(error.message).toBe('Moto não encontrada');
    expect(error.status).toBe(404);
  });

  it('preserva a lista de erros por campo', () => {
    const errors = [{ field: 'price', message: 'obrigatório' }];
    const error = normalizeApiError({ response: { status: 422, data: { message: 'x', errors } } });

    expect(error.errors).toEqual(errors);
  });

  it('informa falha de conexão quando não há resposta', () => {
    const error = normalizeApiError({ request: {} });

    expect(error.message).toContain('conectar à API');
    expect(error.status).toBeNull();
  });

  it('trata erro inesperado sem response nem request', () => {
    expect(normalizeApiError(new Error('boom')).message).toBe('boom');
    expect(normalizeApiError(undefined).message).toContain('inesperado');
  });
});
