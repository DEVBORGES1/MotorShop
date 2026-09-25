import { USER_ROLE } from '@motorshop/shared';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../src/app.js';
import { RefreshToken } from '../../src/modules/auth/refreshToken.model.js';
import { Brand } from '../../src/modules/brands/brand.model.js';
import { Lead } from '../../src/modules/leads/lead.model.js';
import { Moto } from '../../src/modules/motos/moto.model.js';
import { StoreSettings } from '../../src/modules/store/store.model.js';
import { User } from '../../src/modules/users/user.model.js';
import {
  criarLead,
  criarLoja,
  criarMarca,
  criarMoto,
  criarUsuarioDoPainel,
} from '../factories/index.js';
import { autenticar, comToken, SENHA_VALIDA } from '../helpers/auth.js';
import { connect, disconnect, skipWithoutDb } from '../helpers/db.js';

/**
 * Caminho feliz e de falha das rotas que a matriz de permissões só cobria no
 * acesso (quem entra), não no comportamento (o que devolvem). Com isso, todo
 * endpoint da API tem os dois lados testados.
 */

const app = createApp();
const ID_INEXISTENTE = '507f1f77bcf86cd799439011';

async function tokenDe(role) {
  const user = await criarUsuarioDoPainel({ role });
  return (await autenticar(app, { email: user.email, password: SENHA_VALIDA })).accessToken;
}

describe.skipIf(skipWithoutDb)('endpoints: caminho feliz e de falha', () => {
  let admin;
  let dono;

  beforeAll(connect);
  afterAll(disconnect);

  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      RefreshToken.deleteMany({}),
      StoreSettings.deleteMany({}),
      Brand.deleteMany({}),
      Moto.deleteMany({}),
      Lead.deleteMany({}),
    ]);
    admin = await tokenDe(USER_ROLE.ADMIN);
    dono = await tokenDe(USER_ROLE.SUPER_ADMIN);
  });

  const get = (url, token) => comToken(request(app).get(url), token);
  const patch = (url, token) => comToken(request(app).patch(url), token);

  describe('configuração da loja', () => {
    it('GET /api/store sem loja configurada: padrão genérico, marcado como não configurado', async () => {
      const res = await request(app).get('/api/store');

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ name: 'MotorShop', configured: false });
    });

    it('GET /api/admin/store sem loja configurada → 404', async () => {
      expect((await get('/api/admin/store', admin)).status).toBe(404);
    });

    it('PATCH /api/admin/store salva e o site público passa a mostrar', async () => {
      const res = await patch('/api/admin/store', dono).send({
        name: 'Motos do Vale',
        contact: { whatsapp: '49999990000' },
      });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Motos do Vale');

      const publica = await request(app).get('/api/store');
      expect(publica.body.data).toMatchObject({ name: 'Motos do Vale', configured: true });
      const completa = await get('/api/admin/store', admin);
      expect(completa.status).toBe(200);
      expect(completa.body.data.name).toBe('Motos do Vale');
    });

    it('PATCH /api/admin/store com dado inválido → 422 e nada muda', async () => {
      await criarLoja({ name: 'Loja Original' });

      const res = await patch('/api/admin/store', dono).send({ theme: { primary: 'vermelho' } });

      expect(res.status).toBe(422);
      expect((await StoreSettings.findOne().lean()).name).toBe('Loja Original');
    });
  });

  describe('leitura de um item no painel', () => {
    it('GET /api/admin/marcas lista todas, inclusive as sem moto', async () => {
      await criarMarca({ name: 'Honda', slug: 'honda' });
      await criarMarca({ name: 'Ducati', slug: 'ducati' });

      const res = await get('/api/admin/marcas', admin);

      expect(res.status).toBe(200);
      expect(res.body.data.map((m) => m.name).sort()).toEqual(['Ducati', 'Honda']);
    });

    it('GET /api/admin/marcas/:id devolve a marca; inexistente → 404; id inválido → 422', async () => {
      const marca = await criarMarca({ name: 'Yamaha', slug: 'yamaha' });

      expect((await get(`/api/admin/marcas/${marca._id}`, admin)).body.data.name).toBe('Yamaha');
      expect((await get(`/api/admin/marcas/${ID_INEXISTENTE}`, admin)).status).toBe(404);
      expect((await get('/api/admin/marcas/nao-e-id', admin)).status).toBe(422);
    });

    it('GET /api/admin/usuarios/:id devolve o usuário sem hash; inexistente → 404', async () => {
      const user = await criarUsuarioDoPainel({ name: 'Ana Vendas' });

      const res = await get(`/api/admin/usuarios/${user._id}`, dono);
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Ana Vendas');
      expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|argon2/);

      expect((await get(`/api/admin/usuarios/${ID_INEXISTENTE}`, dono)).status).toBe(404);
    });

    it('GET /api/admin/leads/:id devolve o lead com a moto; inexistente → 404; id inválido → 422', async () => {
      const moto = await criarMoto({ model: 'XRE 300' });
      const lead = await criarLead({ type: 'MOTO_INTEREST', moto: moto._id, name: 'João' });

      const res = await get(`/api/admin/leads/${lead._id}`, admin);
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ name: 'João', moto: { model: 'XRE 300' } });

      expect((await get(`/api/admin/leads/${ID_INEXISTENTE}`, admin)).status).toBe(404);
      expect((await get('/api/admin/leads/123', admin)).status).toBe(422);
    });
  });

  describe('marcas', () => {
    it('renomear para o nome de outra marca → 409, com mensagem clara', async () => {
      await criarMarca({ name: 'Honda', slug: 'honda' });
      const outra = await criarMarca({ name: 'Hondaa', slug: 'hondaa' });

      const res = await patch(`/api/admin/marcas/${outra._id}`, admin).send({ name: 'Honda' });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/Já existe uma marca chamada "Honda"/);
    });
  });

  describe('sessão', () => {
    it('refresh de sessão vencida → 401 "Sessão expirada"', async () => {
      const user = await criarUsuarioDoPainel();
      const { refreshCookie } = await autenticar(app, { email: user.email });
      await RefreshToken.updateMany({}, { expiresAt: new Date(Date.now() - 1000) });

      const res = await request(app).post('/api/auth/refresh').set('Cookie', refreshCookie);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Sessão expirada');
    });

    it('refresh com sessão que não existe mais no banco → 401', async () => {
      const user = await criarUsuarioDoPainel();
      const { refreshCookie } = await autenticar(app, { email: user.email });
      await RefreshToken.deleteMany({});

      const res = await request(app).post('/api/auth/refresh').set('Cookie', refreshCookie);

      expect(res.status).toBe(401);
    });
  });

  it('GET /api (raiz) responde e aponta o health e o catálogo', async () => {
    const res = await request(app).get('/api/');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ health: '/api/health', catalog: '/api/motos' });
  });
});
