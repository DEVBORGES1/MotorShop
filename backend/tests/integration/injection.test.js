import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../src/app.js';
import { connect, disconnect, skipWithoutDb } from '../helpers/db.js';

/**
 * Tentativas de injeção NoSQL (ARCHITECTURE §8.5): operadores do MongoDB
 * enviados pela query ou pelo corpo precisam ser recusados na validação —
 * nunca virar filtro, e nunca virar 500.
 */
const app = createApp();

describe.skipIf(skipWithoutDb)('injeção NoSQL', () => {
  beforeAll(connect);
  afterAll(disconnect);

  it.each([
    '/api/motos?marca[$ne]=x',
    '/api/motos?q[$regex]=.*',
    '/api/motos?sort[$gt]=',
    '/api/motos?precoMin[$gt]=0',
    '/api/motos?status=INACTIVE',
    '/api/filtros?combustivel[$in][]=FLEX',
  ])('query %s → 422, sem vazar nada', async (url) => {
    const res = await request(app).get(url);
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('login com operador no lugar do e-mail e da senha → 422 (não 200, não 500)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: { $gt: '' }, password: { $gt: '' } });
    expect(res.status).toBe(422);
  });

  it('lead com operador no lugar dos campos → 422', async () => {
    const res = await request(app)
      .post('/api/leads')
      .send({ type: 'CONTACT', name: { $ne: null }, phone: { $gt: '' }, message: 'x' });
    expect(res.status).toBe(422);
  });

  it('slug com caracteres de operador → 422', async () => {
    expect((await request(app).get('/api/motos/slug/$where')).status).toBe(422);
  });
});
