import { USER_ROLE } from '@motorshop/shared';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../src/app.js';
import { RefreshToken } from '../../src/modules/auth/refreshToken.model.js';
import { User } from '../../src/modules/users/user.model.js';
import * as userService from '../../src/modules/users/user.service.js';
import { SENHA_VALIDA, autenticar, criarUsuario } from '../helpers/auth.js';
import { connect, disconnect, skipWithoutDb } from '../helpers/db.js';

const app = createApp();

/** Autentica como SUPER_ADMIN e devolve o token e o próprio usuário. */
async function comoSuperAdmin(email = 'super@teste.com') {
  const user = await criarUsuario({ email, role: USER_ROLE.SUPER_ADMIN });
  const { accessToken } = await autenticar(app, { email });
  return { user, accessToken };
}

const autenticado = (req, token) => req.set('Authorization', `Bearer ${token}`);

describe.skipIf(skipWithoutDb)('gestão de usuários', () => {
  beforeAll(connect);
  afterAll(disconnect);

  beforeEach(async () => {
    await Promise.all([User.deleteMany({}), RefreshToken.deleteMany({})]);
  });

  describe('POST /api/admin/usuarios', () => {
    it('cria usuário e nunca devolve o hash', async () => {
      const { accessToken } = await comoSuperAdmin();

      const response = await autenticado(
        request(app).post('/api/admin/usuarios'),
        accessToken,
      ).send({
        name: 'Novo Admin',
        email: 'novo@teste.com',
        password: 'outra-chave-bem-forte-2026',
      });

      expect(response.status).toBe(201);
      expect(response.body.data.role).toBe(USER_ROLE.ADMIN);
      expect(response.body.data).not.toHaveProperty('passwordHash');
      expect(JSON.stringify(response.body)).not.toMatch(/argon2/);
    });

    it('armazena a senha como hash, nunca em texto puro', async () => {
      const { accessToken } = await comoSuperAdmin();
      const senha = 'chave-que-nao-pode-vazar-2026';

      await autenticado(request(app).post('/api/admin/usuarios'), accessToken).send({
        name: 'X',
        email: 'x@teste.com',
        password: senha,
      });

      const doc = await User.findOne({ email: 'x@teste.com' }).select('+passwordHash').lean();
      expect(doc.passwordHash).not.toContain(senha);
      expect(doc.passwordHash.startsWith('$argon2id$')).toBe(true);
    });

    it('recusa e-mail duplicado com 409', async () => {
      const { accessToken } = await comoSuperAdmin();
      await criarUsuario({ email: 'ja@existe.com' });

      const response = await autenticado(
        request(app).post('/api/admin/usuarios'),
        accessToken,
      ).send({
        name: 'X',
        email: 'ja@existe.com',
        password: 'chave-bem-forte-do-teste',
      });

      expect(response.status).toBe(409);
    });

    it.each([
      ['curta', 'curta123'],
      ['previsível', 'senha12345678'],
      ['óbvia', 'password12345'],
    ])('recusa senha %s com 422', async (_rotulo, password) => {
      const { accessToken } = await comoSuperAdmin();

      const response = await autenticado(
        request(app).post('/api/admin/usuarios'),
        accessToken,
      ).send({
        name: 'X',
        email: 'x@teste.com',
        password,
      });

      expect(response.status).toBe(422);
    });

    it('recusa campo desconhecido — sem mass assignment de passwordHash', async () => {
      const { accessToken } = await comoSuperAdmin();

      const response = await autenticado(
        request(app).post('/api/admin/usuarios'),
        accessToken,
      ).send({
        name: 'X',
        email: 'x@teste.com',
        password: 'chave-bem-forte-do-teste',
        passwordHash: '$argon2id$forjado',
      });

      expect(response.status).toBe(422);
    });
  });

  describe('proteção contra autoalteração', () => {
    it('impede o super admin de alterar o próprio papel', async () => {
      const { user, accessToken } = await comoSuperAdmin();

      const response = await autenticado(
        request(app).patch(`/api/admin/usuarios/${user._id}`),
        accessToken,
      ).send({ role: USER_ROLE.ADMIN });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/próprio papel/i);
    });

    it('impede o usuário de se desativar pelo PATCH', async () => {
      const { user, accessToken } = await comoSuperAdmin();

      const response = await autenticado(
        request(app).patch(`/api/admin/usuarios/${user._id}`),
        accessToken,
      ).send({ active: false });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/a si mesmo/i);
    });

    it('impede o usuário de se desativar pelo DELETE', async () => {
      const { user, accessToken } = await comoSuperAdmin();

      const response = await autenticado(
        request(app).delete(`/api/admin/usuarios/${user._id}`),
        accessToken,
      );

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/a si mesmo/i);
    });

    it('permite alterar OUTRO super admin', async () => {
      const { accessToken } = await comoSuperAdmin();
      const outro = await criarUsuario({ email: 'outro@teste.com', role: USER_ROLE.SUPER_ADMIN });

      const response = await autenticado(
        request(app).patch(`/api/admin/usuarios/${outro._id}`),
        accessToken,
      ).send({ role: USER_ROLE.ADMIN });

      expect(response.status).toBe(200);
      expect(response.body.data.role).toBe(USER_ROLE.ADMIN);
    });
  });

  describe('guarda do último super administrador (nível de serviço)', () => {
    // Inalcançável pela API — o ator já é um SUPER_ADMIN ativo e conta como
    // "outro". Testada aqui chamando o serviço direto, que é onde ela vale.
    it('recusa desativar o único SUPER_ADMIN ativo', async () => {
      const unico = await criarUsuario({ email: 'unico@teste.com', role: USER_ROLE.SUPER_ADMIN });

      await expect(
        userService.update(String(unico._id), { active: false }, 'outro-ator-qualquer'),
      ).rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/único super/i) });
    });

    it('recusa rebaixar o único SUPER_ADMIN ativo', async () => {
      const unico = await criarUsuario({ email: 'unico@teste.com', role: USER_ROLE.SUPER_ADMIN });

      await expect(
        userService.update(String(unico._id), { role: USER_ROLE.ADMIN }, 'outro-ator-qualquer'),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('permite quando existe outro SUPER_ADMIN ativo', async () => {
      const alvo = await criarUsuario({ email: 'a@teste.com', role: USER_ROLE.SUPER_ADMIN });
      await criarUsuario({ email: 'b@teste.com', role: USER_ROLE.SUPER_ADMIN });

      const atualizado = await userService.update(
        String(alvo._id),
        { role: USER_ROLE.ADMIN },
        'outro-ator-qualquer',
      );

      expect(atualizado.role).toBe(USER_ROLE.ADMIN);
    });

    it('ignora a guarda quando o alvo não é SUPER_ADMIN', async () => {
      const comum = await criarUsuario({ email: 'comum@teste.com', role: USER_ROLE.ADMIN });

      const atualizado = await userService.update(
        String(comum._id),
        { active: false },
        'outro-ator-qualquer',
      );

      expect(atualizado.active).toBe(false);
    });
  });

  describe('efeitos colaterais de segurança', () => {
    it('desativar um usuário encerra as sessões dele', async () => {
      const { accessToken } = await comoSuperAdmin();
      await criarUsuario({ email: 'alvo@teste.com' });
      const alvo = await autenticar(app, { email: 'alvo@teste.com' });
      const alvoId = (await User.findOne({ email: 'alvo@teste.com' }))._id;

      expect(await RefreshToken.countDocuments({ user: alvoId, revokedAt: null })).toBe(1);

      await autenticado(request(app).delete(`/api/admin/usuarios/${alvoId}`), accessToken);

      expect(await RefreshToken.countDocuments({ user: alvoId, revokedAt: null })).toBe(0);
      expect(
        (await request(app).get('/api/auth/me').set('Authorization', `Bearer ${alvo.accessToken}`))
          .status,
      ).toBe(401);
    });

    it('trocar a senha encerra as sessões abertas', async () => {
      const { accessToken } = await comoSuperAdmin();
      await criarUsuario({ email: 'alvo@teste.com' });
      await autenticar(app, { email: 'alvo@teste.com' });
      const alvoId = (await User.findOne({ email: 'alvo@teste.com' }))._id;

      await autenticado(request(app).patch(`/api/admin/usuarios/${alvoId}`), accessToken).send({
        password: 'uma-chave-nova-bem-forte-2026',
      });

      expect(await RefreshToken.countDocuments({ user: alvoId, revokedAt: null })).toBe(0);
    });

    it('a nova senha passa a valer e a antiga não', async () => {
      const { accessToken } = await comoSuperAdmin();
      await criarUsuario({ email: 'alvo@teste.com' });
      const alvoId = (await User.findOne({ email: 'alvo@teste.com' }))._id;
      const novaSenha = 'uma-chave-nova-bem-forte-2026';

      await autenticado(request(app).patch(`/api/admin/usuarios/${alvoId}`), accessToken).send({
        password: novaSenha,
      });

      expect(
        (await autenticar(app, { email: 'alvo@teste.com', password: SENHA_VALIDA })).response
          .status,
      ).toBe(401);
      expect(
        (await autenticar(app, { email: 'alvo@teste.com', password: novaSenha })).response.status,
      ).toBe(200);
    });
  });

  describe('GET /api/admin/usuarios', () => {
    it('lista sem expor hashes', async () => {
      const { accessToken } = await comoSuperAdmin();
      await criarUsuario({ email: 'outro@teste.com' });

      const response = await autenticado(request(app).get('/api/admin/usuarios'), accessToken);

      expect(response.body.data).toHaveLength(2);
      expect(JSON.stringify(response.body)).not.toMatch(/argon2|passwordHash/);
      expect(response.body.data[0]).toHaveProperty('id');
      expect(response.body.data[0]).not.toHaveProperty('_id');
    });
  });
});
