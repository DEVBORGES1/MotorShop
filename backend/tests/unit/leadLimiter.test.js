import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createLeadLimiter } from '../../src/middlewares/rateLimiters.js';

/**
 * O limitador da aplicação fica desligado em teste (atrapalharia a suíte).
 * Aqui se monta um ligado, com a mesma configuração, sobre uma rota mínima.
 */
function appComLimite() {
  const app = express();
  app.post('/leads', createLeadLimiter({ skip: () => false }), (req, res) => res.status(201).end());
  return app;
}

describe('limitador de leads', () => {
  it('aceita 5 envios por hora e recusa o 6º com 429', async () => {
    const app = appComLimite();

    for (let i = 0; i < 5; i += 1) {
      expect((await request(app).post('/leads')).status).toBe(201);
    }

    const sexto = await request(app).post('/leads');
    expect(sexto.status).toBe(429);
    expect(sexto.body.success).toBe(false);
  });
});
