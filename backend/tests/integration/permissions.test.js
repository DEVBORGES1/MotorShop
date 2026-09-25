import { USER_ROLE } from '@motorshop/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../src/app.js';
import { RefreshToken } from '../../src/modules/auth/refreshToken.model.js';
import { User } from '../../src/modules/users/user.model.js';
import { ADMIN_ROUTERS } from '../../src/routes/index.js';
import { loginDeAdmin } from '../helpers/auth.js';
import { connect, disconnect, skipWithoutDb } from '../helpers/db.js';

/**
 * Matriz de permissões COMPLETA, descoberta das próprias rotas.
 *
 * Nada de lista escrita à mão: o teste percorre cada roteador do painel
 * (`ADMIN_ROUTERS`), lê de cada `authorize` os papéis exigidos e confere:
 *   anônimo           → 401
 *   papel insuficiente → 403
 *   papel suficiente  → passa da autorização (qualquer coisa exceto 401/403)
 * Uma rota nova entra na matriz no dia em que é criada.
 */

const OBJECT_ID = '507f1f77bcf86cd799439011';
const UUID = '2b1f9a8e-6d2c-4f6e-9b0a-1c2d3e4f5a6b';
const PARAMS = { ':id': OBJECT_ID, ':imageId': UUID };

const rolesOf = (layer) => layer?.handle?.roles ?? layer?.roles ?? null;

/** Papéis exigidos: os do roteador inteiro e os da rota (os dois valem). */
function descobrirRotas() {
  const rotas = [];

  for (const [prefixo, router] of ADMIN_ROUTERS) {
    const exigidosNoRoteador = router.stack
      .filter((layer) => !layer.route && rolesOf(layer))
      .map(rolesOf);

    for (const layer of router.stack.filter((l) => l.route)) {
      const exigidosNaRota = layer.route.stack.map(rolesOf).filter(Boolean);
      const exigencias = [...exigidosNoRoteador, ...exigidosNaRota];
      const caminho =
        `/api/admin${prefixo}${layer.route.path === '/' ? '' : layer.route.path}`.replace(
          /:\w+/g,
          (param) => PARAMS[param] ?? OBJECT_ID,
        );

      for (const metodo of Object.keys(layer.route.methods)) {
        rotas.push({
          metodo: metodo.toUpperCase(),
          caminho,
          // Cada `authorize` precisa ser satisfeito: o papel precisa estar em todos.
          permitido: (papel) => exigencias.every((papeis) => papeis.includes(papel)),
        });
      }
    }
  }
  return rotas;
}

const app = createApp();
const ROTAS = descobrirRotas();
const chamar = ({ metodo, caminho }, token) => {
  const req = request(app)[metodo.toLowerCase()](caminho);
  return (token ? req.set('Authorization', `Bearer ${token}`) : req).send({});
};

describe('descoberta das rotas', () => {
  it('encontra todas as rotas do painel, com os papéis certos', () => {
    const achar = (metodo, caminho) =>
      ROTAS.find((r) => r.metodo === metodo && r.caminho === caminho);

    expect(ROTAS.length).toBeGreaterThanOrEqual(25);
    // Amostras conhecidas, para o teste não passar "vazio" se a descoberta quebrar.
    expect(achar('DELETE', `/api/admin/leads/${OBJECT_ID}`).permitido(USER_ROLE.ADMIN)).toBe(false);
    expect(achar('GET', '/api/admin/usuarios').permitido(USER_ROLE.ADMIN)).toBe(false);
    expect(achar('PATCH', '/api/admin/store').permitido(USER_ROLE.ADMIN)).toBe(false);
    expect(achar('GET', '/api/admin/store').permitido(USER_ROLE.ADMIN)).toBe(true);
    expect(achar('POST', '/api/admin/uploads/assinatura').permitido(USER_ROLE.ADMIN)).toBe(true);
  });
});

describe.skipIf(skipWithoutDb)('matriz de permissões', () => {
  const tokens = {};

  beforeAll(async () => {
    await connect();
    await Promise.all([User.deleteMany({}), RefreshToken.deleteMany({})]);
    tokens[USER_ROLE.ADMIN] = await loginDeAdmin(app, USER_ROLE.ADMIN);
    tokens[USER_ROLE.SUPER_ADMIN] = await loginDeAdmin(app, USER_ROLE.SUPER_ADMIN);
  });
  afterAll(disconnect);

  it.each(ROTAS.map((r) => [r.metodo, r.caminho, r]))(
    '%s %s — anônimo recebe 401',
    async (_m, _c, rota) => {
      expect((await chamar(rota)).status).toBe(401);
    },
  );

  it.each(ROTAS.map((r) => [r.metodo, r.caminho, r]))(
    '%s %s — token inválido recebe 401',
    async (_m, _c, rota) => {
      expect((await chamar(rota, 'token.invalido.aqui')).status).toBe(401);
    },
  );

  it.each(ROTAS.map((r) => [r.metodo, r.caminho, r]))(
    '%s %s — ADMIN conforme a matriz',
    async (_m, _c, rota) => {
      const { status } = await chamar(rota, tokens[USER_ROLE.ADMIN]);
      if (rota.permitido(USER_ROLE.ADMIN)) {
        expect([401, 403]).not.toContain(status);
      } else {
        expect(status).toBe(403);
      }
    },
  );

  it.each(ROTAS.map((r) => [r.metodo, r.caminho, r]))(
    '%s %s — SUPER_ADMIN passa da autorização',
    async (_m, _c, rota) => {
      expect([401, 403]).not.toContain((await chamar(rota, tokens[USER_ROLE.SUPER_ADMIN])).status);
    },
  );
});
