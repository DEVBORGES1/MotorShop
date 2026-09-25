import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

/**
 * Por que TRUST_PROXY_HOPS precisa bater com o deploy: o valor decide se o
 * `X-Forwarded-For` enviado pelo próprio visitante é aceito como IP dele.
 */
function ipVisto(hops, xff) {
  const app = express();
  app.set('trust proxy', hops);
  app.get('/', (req, res) => res.send(req.ip));
  return request(app)
    .get('/')
    .set('X-Forwarded-For', xff)
    .then((r) => r.text);
}

describe('trust proxy', () => {
  it('sem proxy (0): o X-Forwarded-For forjado é ignorado', async () => {
    expect(await ipVisto(0, '6.6.6.6')).not.toBe('6.6.6.6');
  });

  it('com 1 proxy: vale o endereço que o proxy acrescentou, não o forjado antes dele', async () => {
    // O visitante manda "6.6.6.6"; o proxy acrescenta o IP real "200.1.1.1".
    expect(await ipVisto(1, '6.6.6.6, 200.1.1.1')).toBe('200.1.1.1');
  });
});
