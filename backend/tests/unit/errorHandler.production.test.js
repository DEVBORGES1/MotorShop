import { describe, expect, it, vi } from 'vitest';

// Produção.
vi.mock('../../src/config/env.js', async (original) => {
  const real = await original();
  return { ...real, env: { ...real.env, isProduction: true } };
});

const { errorHandler } = await import('../../src/middlewares/errorHandler.js');
const { ApiError } = await import('../../src/utils/ApiError.js');

function responder(erro) {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  errorHandler(erro, { id: 'req-1' }, res, () => {});
  return { status: res.status.mock.calls[0][0], corpo: res.json.mock.calls[0][0] };
}

describe('erros em produção', () => {
  it('erro inesperado: 500 genérico, sem stack, sem mensagem interna', () => {
    const { status, corpo } = responder(
      new Error('E11000 duplicate key error collection: motorshop.users index: email_1'),
    );

    expect(status).toBe(500);
    expect(corpo.message).toBe('Erro interno do servidor');
    expect(corpo).not.toHaveProperty('stack');
    expect(JSON.stringify(corpo)).not.toMatch(/E11000|collection|motorshop\.|node_modules|\.js:/);
    expect(corpo.requestId).toBe('req-1'); // para cruzar com o log
  });

  it('erro do Mongoose (CastError) não expõe modelo nem campo', () => {
    const erro = Object.assign(
      new Error('Cast to ObjectId failed for value "x" at path "_id" for model "Moto"'),
      {
        name: 'CastError',
      },
    );
    expect(JSON.stringify(responder(erro).corpo)).not.toMatch(/Moto|ObjectId|_id/);
  });

  it('erro operacional mantém a mensagem pensada para o cliente, sem stack', () => {
    const { status, corpo } = responder(new ApiError(404, 'Moto não encontrada'));
    expect(status).toBe(404);
    expect(corpo.message).toBe('Moto não encontrada');
    expect(corpo).not.toHaveProperty('stack');
  });
});
