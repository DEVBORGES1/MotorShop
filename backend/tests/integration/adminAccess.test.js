import { USER_ROLE } from '@motorshop/shared';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../src/app.js';
import { RefreshToken } from '../../src/modules/auth/refreshToken.model.js';
import { Brand } from '../../src/modules/brands/brand.model.js';
import { User } from '../../src/modules/users/user.model.js';
import { autenticar, criarUsuario } from '../helpers/auth.js';
import { connect, disconnect, skipWithoutDb } from '../helpers/db.js';

const app = createApp();

/**
 * Matriz de autorização: toda rota administrativa precisa recusar anônimo, e as
 * de SUPER_ADMIN precisam recusar ADMIN. Um `it.each` garante que uma rota nova
 * seja acrescentada aqui conscientemente, e não esquecida.
 */
const ROTAS_ADMIN = [
  ['GET', '/api/admin/motos'],
  ['POST', '/api/admin/motos'],
  ['GET', '/api/admin/motos/507f1f77bcf86cd799439011'],
  ['PATCH', '/api/admin/motos/507f1f77bcf86cd799439011'],
  ['PATCH', '/api/admin/motos/507f1f77bcf86cd799439011/status'],
  ['DELETE', '/api/admin/motos/507f1f77bcf86cd799439011'],
  ['GET', '/api/admin/marcas'],
  ['POST', '/api/admin/marcas'],
  ['PATCH', '/api/admin/marcas/507f1f77bcf86cd799439011'],
  ['DELETE', '/api/admin/marcas/507f1f77bcf86cd799439011'],
  ['GET', '/api/admin/usuarios'],
  ['POST', '/api/admin/usuarios'],
  ['PATCH', '/api/admin/usuarios/507f1f77bcf86cd799439011'],
  ['DELETE', '/api/admin/usuarios/507f1f77bcf86cd799439011'],
  ['GET', '/api/admin/store'],
  ['PATCH', '/api/admin/store'],
];

/** Rotas que exigem SUPER_ADMIN — um ADMIN comum deve receber 403. */
const ROTAS_SUPER_ADMIN = [
  ['GET', '/api/admin/usuarios'],
  ['POST', '/api/admin/usuarios'],
  ['PATCH', '/api/admin/usuarios/507f1f77bcf86cd799439011'],
  ['DELETE', '/api/admin/usuarios/507f1f77bcf86cd799439011'],
  ['PATCH', '/api/admin/store'],
];

const chamar = (metodo, rota, token) => {
  const req = request(app)[metodo.toLowerCase()](rota);
  return token ? req.set('Authorization', `Bearer ${token}`).send({}) : req.send({});
};

describe.skipIf(skipWithoutDb)('acesso às rotas administrativas', () => {
  beforeAll(connect);
  afterAll(disconnect);

  beforeEach(async () => {
    await Promise.all([User.deleteMany({}), RefreshToken.deleteMany({}), Brand.deleteMany({})]);
  });

  it.each(ROTAS_ADMIN)('%s %s recusa acesso anônimo com 401', async (metodo, rota) => {
    const response = await chamar(metodo, rota, null);

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it.each(ROTAS_ADMIN)('%s %s recusa token inválido com 401', async (metodo, rota) => {
    expect((await chamar(metodo, rota, 'token-falso')).status).toBe(401);
  });

  it.each(ROTAS_SUPER_ADMIN)('%s %s recusa ADMIN comum com 403', async (metodo, rota) => {
    await criarUsuario({ role: USER_ROLE.ADMIN });
    const { accessToken } = await autenticar(app);

    const response = await chamar(metodo, rota, accessToken);

    expect(response.status).toBe(403);
    expect(response.body.message).toMatch(/permissão/i);
  });

  it('um ADMIN comum opera motos e marcas normalmente', async () => {
    await criarUsuario({ role: USER_ROLE.ADMIN });
    const { accessToken } = await autenticar(app);

    const response = await request(app)
      .get('/api/admin/motos')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
  });

  it('as rotas públicas seguem abertas', async () => {
    for (const rota of ['/api/motos', '/api/marcas', '/api/filtros', '/api/store', '/api/health']) {
      expect((await request(app).get(rota)).status).toBe(200);
    }
  });
});
