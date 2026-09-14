import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * A trava administrativa é o que impede que um deploy feito nesta fase —
 * antes da autenticação da FASE 3 — exponha escrita sem credencial.
 */
const mockEnv = { isProduction: false };
vi.mock('../../src/config/env.js', () => ({ env: mockEnv }));

const { adminGuard } = await import('../../src/middlewares/adminGuard.js');

describe('adminGuard', () => {
  let next;

  beforeEach(() => {
    next = vi.fn();
  });

  it('libera a passagem fora de produção', () => {
    mockEnv.isProduction = false;

    adminGuard({}, {}, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('bloqueia com 503 em produção, até a FASE 3 trazer autenticação', () => {
    mockEnv.isProduction = true;

    adminGuard({}, {}, next);

    const [error] = next.mock.calls[0];
    expect(error.statusCode).toBe(503);
    expect(error.message).toMatch(/autenticação/i);
  });
});
