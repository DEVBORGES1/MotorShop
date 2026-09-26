import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';

// Cópia mutável do ambiente: cada teste escolhe se é produção.
vi.mock('../../src/config/env.js', async (original) => ({
  env: { ...(await original()).env },
}));

const pastaVazia = () => mkdtempSync(join(tmpdir(), 'sem-build-'));

/**
 * Deploy sem o build do site não pode subir: o servidor falha na partida, o
 * health check do provedor nunca passa e a versão anterior continua no ar.
 */
describe('createApp sem o build do site', () => {
  afterEach(() => {
    env.isProduction = false;
  });

  it('em produção, recusa subir', () => {
    env.isProduction = true;
    expect(() => createApp({ frontendDir: pastaVazia() })).toThrow(/Build do site não encontrado/);
  });

  it('fora de produção, sobe só com a API (desenvolvimento do backend)', () => {
    expect(() => createApp({ frontendDir: pastaVazia() })).not.toThrow();
  });
});
