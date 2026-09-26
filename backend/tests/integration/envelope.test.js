import { USER_ROLE } from '@motorshop/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../src/app.js';
import { ADMIN_ROUTERS } from '../../src/routes/index.js';
import { criarLoja, criarMoto } from '../factories/index.js';
import { loginDeAdmin } from '../helpers/auth.js';
import { connect, disconnect, skipWithoutDb } from '../helpers/db.js';

/**
 * Envelope único em TODAS as respostas da API (ARCHITECTURE §6.2 e §6.3):
 * sucesso `{ success: true, data, message }`, erro
 * `{ success: false, message, errors, requestId }`. O cliente nunca adivinha
 * o formato. As rotas do painel são descobertas das próprias rotas — uma rota
 * nova entra na verificação sozinha.
 */

const app = createApp();
const OBJECT_ID = '507f1f77bcf86cd799439011';
const PARAMS = {
  ':id': OBJECT_ID,
  ':imageId': '2b1f9a8e-6d2c-4f6e-9b0a-1c2d3e4f5a6b',
  ':tipo': 'logo',
};

function rotasDoPainel() {
  const rotas = [];
  for (const [prefixo, router] of ADMIN_ROUTERS) {
    for (const layer of router.stack.filter((l) => l.route)) {
      const caminho =
        `/api/admin${prefixo}${layer.route.path === '/' ? '' : layer.route.path}`.replace(
          /:\w+/g,
          (p) => PARAMS[p] ?? OBJECT_ID,
        );
      for (const metodo of Object.keys(layer.route.methods)) rotas.push([metodo, caminho]);
    }
  }
  return rotas;
}

const PUBLICAS = [
  ['get', '/api'],
  ['get', '/api/health'],
  ['get', '/api/motos'],
  ['get', '/api/motos?precoMin=abc'],
  ['get', '/api/motos/slug/nao-existe'],
  ['get', '/api/motos/slug/nao-existe/similares'],
  ['get', '/api/marcas'],
  ['get', '/api/store'],
  ['get', '/api/filtros'],
  ['post', '/api/leads'],
  ['post', '/api/auth/login'],
  ['post', '/api/auth/refresh'],
  ['post', '/api/auth/logout'],
  ['get', '/api/auth/me'],
  ['get', '/api/rota-que-nao-existe'],
];

function conferirEnvelope(res, rota) {
  if (res.status === 204) {
    expect(res.text, rota).toBe('');
    return;
  }
  expect(res.status, `${rota}: erro interno`).toBeLessThan(500);
  expect(res.headers['content-type'], rota).toMatch(/application\/json/);
  const corpo = res.body;
  expect(typeof corpo.success, rota).toBe('boolean');
  if (corpo.success) {
    expect(corpo, rota).toHaveProperty('data');
    expect(corpo, rota).toHaveProperty('message');
  } else {
    expect(typeof corpo.message, rota).toBe('string');
    expect(corpo.message.length, rota).toBeGreaterThan(0);
    expect(Array.isArray(corpo.errors), rota).toBe(true);
    expect(typeof corpo.requestId, rota).toBe('string');
    expect(corpo, rota).not.toHaveProperty('data');
  }
}

describe.skipIf(skipWithoutDb)('envelope de resposta em todos os endpoints', () => {
  let token;

  beforeAll(async () => {
    await connect();
    await criarLoja();
    await criarMoto({ slug: 'honda-teste-2022' });
    token = await loginDeAdmin(app, USER_ROLE.SUPER_ADMIN);
  });
  afterAll(disconnect);

  it.each(PUBLICAS)('%s %s', async (metodo, caminho) => {
    conferirEnvelope(await request(app)[metodo](caminho).send({}), `${metodo} ${caminho}`);
  });

  it('com dados reais: moto existente e similares', async () => {
    conferirEnvelope(await request(app).get('/api/motos/slug/honda-teste-2022'), 'moto');
    conferirEnvelope(
      await request(app).get('/api/motos/slug/honda-teste-2022/similares'),
      'similares',
    );
  });

  it('toda rota do painel, sem token e com o dono', async () => {
    const rotas = rotasDoPainel();
    expect(rotas.length).toBeGreaterThan(30);
    for (const [metodo, caminho] of rotas) {
      const rota = `${metodo.toUpperCase()} ${caminho}`;
      conferirEnvelope(await request(app)[metodo](caminho).send({}), `${rota} (anônimo)`);
      conferirEnvelope(
        await request(app)[metodo](caminho).set('Authorization', `Bearer ${token}`).send({}),
        `${rota} (dono)`,
      );
    }
  });
});
