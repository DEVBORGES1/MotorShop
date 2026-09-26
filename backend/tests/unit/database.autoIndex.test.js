import { afterEach, describe, expect, it, vi } from 'vitest';

/** Em produção, índice só pelo script do deploy; fora dela, o Mongoose cria. */
describe('autoIndex na conexão', () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock('mongoose');
    vi.doUnmock('../../src/config/env.js');
  });

  async function opcoesDeConexao(isProduction) {
    const connect = vi.fn().mockResolvedValue();
    vi.doMock('mongoose', () => ({
      default: { connect, connection: { on: vi.fn(), readyState: 0 } },
    }));
    vi.doMock('../../src/config/env.js', () => ({
      env: {
        MONGODB_URI: 'mongodb://banco',
        LOG_LEVEL: 'silent',
        isProduction,
        isTest: !isProduction,
      },
    }));
    const { connectDatabase } = await import('../../src/config/database.js');
    await connectDatabase();
    return connect.mock.lastCall[1];
  }

  it('desligado em produção', async () => {
    expect((await opcoesDeConexao(true)).autoIndex).toBe(false);
  });

  it('ligado em desenvolvimento e teste', async () => {
    expect((await opcoesDeConexao(false)).autoIndex).toBe(true);
  });
});
