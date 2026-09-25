import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createLimiter, RATE_LIMITS } from '../../src/middlewares/rateLimiters.js';

/**
 * Cada linha da tabela de limites: `limit` pedidos passam, o seguinte é 429.
 * Os limitadores da aplicação ficam desligados em teste; aqui cada um é
 * montado ligado, com a mesma configuração, sobre uma rota mínima.
 */
function appCom(nome) {
  const app = express();
  app.use(express.json());
  app.post('/', createLimiter(nome, { skip: () => false }), (req, res) => res.status(200).end());
  return app;
}

describe('limites de requisição', () => {
  it.each(Object.entries(RATE_LIMITS))(
    '%s: %o',
    async (nome, { limit }) => {
      const app = appCom(nome);
      const corpo = { email: 'mesma@conta.test' };

      for (let i = 0; i < limit; i += 1) {
        expect((await request(app).post('/').send(corpo)).status, `pedido ${i + 1}`).toBe(200);
      }

      const excedente = await request(app).post('/').send(corpo);
      expect(excedente.status).toBe(429);
      expect(excedente.body).toMatchObject({ success: false });
    },
    60_000,
  );

  it('login: trocar de e-mail não contorna o limite por IP (credential stuffing)', async () => {
    const app = express();
    app.use(express.json());
    app.post(
      '/',
      createLimiter('loginIp', { skip: () => false }),
      createLimiter('login', { skip: () => false }),
      (req, res) => res.status(200).end(),
    );

    // Um e-mail diferente por tentativa: o limite por conta nunca dispara...
    for (let i = 0; i < RATE_LIMITS.loginIp.limit; i += 1) {
      expect(
        (
          await request(app)
            .post('/')
            .send({ email: `alvo${i}@loja.test` })
        ).status,
      ).toBe(200);
    }
    // ...mas o limite por IP, sim.
    expect((await request(app).post('/').send({ email: 'mais-um@loja.test' })).status).toBe(429);
  });
});
