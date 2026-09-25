import { Writable } from 'node:stream';

import pino from 'pino';
import { describe, expect, it } from 'vitest';

import { REDACT } from '../../src/config/logger.js';

/** Logger com a MESMA configuração de redaction, escrevendo numa string. */
function loggerDeTeste() {
  const linhas = [];
  const destino = new Writable({
    write(chunk, _enc, done) {
      linhas.push(chunk.toString());
      done();
    },
  });
  return { log: pino({ redact: REDACT, base: undefined }, destino), linhas };
}

describe('redaction do log', () => {
  it('remove credenciais e cabeçalhos de sessão de uma requisição', () => {
    const { log, linhas } = loggerDeTeste();
    log.info({
      req: { headers: { authorization: 'Bearer eyJsegredo', cookie: 'motorshop_refresh=abc.def' } },
      res: { headers: { 'set-cookie': 'motorshop_refresh=novo' } },
    });

    const texto = linhas.join('');
    expect(texto).not.toMatch(/eyJsegredo|abc\.def|novo/);
  });

  it('remove senha, tokens e assinatura, na raiz e um nível abaixo', () => {
    const { log, linhas } = loggerDeTeste();
    log.info({
      password: 'senha-1',
      token: 'tok-1',
      signature: 'sig-1',
      body: { password: 'senha-2', refreshToken: 'tok-2', accessToken: 'tok-3' },
    });

    expect(linhas.join('')).not.toMatch(/senha-|tok-|sig-/);
  });

  it('remove telefone e e-mail de lead (R-08)', () => {
    const { log, linhas } = loggerDeTeste();
    log.info({
      phone: '+5549999998888',
      email: 'a@b.test',
      lead: { phone: '+5549', email: 'c@d' },
    });

    expect(linhas.join('')).not.toMatch(/\+5549|@b\.test|c@d/);
  });

  it('mantém o que é útil para investigar', () => {
    const { log, linhas } = loggerDeTeste();
    log.info({ leadId: 'abc123', type: 'CONTACT' }, 'Lead criado');
    expect(linhas.join('')).toContain('abc123');
  });
});
