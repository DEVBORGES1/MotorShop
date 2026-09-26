import { USER_ROLE } from '@motorshop/shared';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../src/app.js';
import { RefreshToken } from '../../src/modules/auth/refreshToken.model.js';
import { User } from '../../src/modules/users/user.model.js';
import { autenticar, criarUsuario, extrairCookie } from '../helpers/auth.js';
import { connect, disconnect, skipWithoutDb } from '../helpers/db.js';

const app = createApp();

describe.skipIf(skipWithoutDb)('autenticação', () => {
  beforeAll(connect);
  afterAll(disconnect);

  beforeEach(async () => {
    await Promise.all([User.deleteMany({}), RefreshToken.deleteMany({})]);
  });

  describe('POST /api/auth/login', () => {
    it('autentica e devolve token e cookie httpOnly', async () => {
      await criarUsuario();

      const { response, accessToken, refreshCookie } = await autenticar(app);

      expect(response.status).toBe(200);
      expect(accessToken).toBeTruthy();
      expect(refreshCookie).toBeTruthy();

      const cookieCru = response.headers['set-cookie'].join(';');
      expect(cookieCru).toMatch(/HttpOnly/i);
      expect(cookieCru).toMatch(/SameSite=Strict/i);
      expect(cookieCru).toMatch(/Path=\/api\/auth/i);
    });

    it('nunca devolve o hash da senha', async () => {
      await criarUsuario();
      const { response } = await autenticar(app);

      expect(JSON.stringify(response.body)).not.toMatch(/argon2|passwordHash/);
      expect(response.body.data.user).not.toHaveProperty('passwordHash');
    });

    it('registra a data do último login', async () => {
      const user = await criarUsuario();
      expect(user.lastLoginAt).toBeNull();

      await autenticar(app);

      expect((await User.findById(user._id)).lastLoginAt).toBeInstanceOf(Date);
    });

    it('devolve a MESMA resposta nos três casos de falha', async () => {
      await criarUsuario({ email: 'ativo@teste.com' });
      await criarUsuario({ email: 'inativo@teste.com', active: false });

      const respostas = await Promise.all([
        autenticar(app, { email: 'nao-existe@teste.com' }),
        autenticar(app, { email: 'ativo@teste.com', password: 'senha-errada-mas-longa' }),
        autenticar(app, { email: 'inativo@teste.com' }),
      ]);

      // Distinguir os casos revelaria quais e-mails estão cadastrados.
      for (const { response } of respostas) {
        expect(response.status).toBe(401);
        expect(response.body.message).toBe('E-mail ou senha inválidos');
      }

      const mensagens = new Set(respostas.map((r) => r.response.body.message));
      expect(mensagens.size).toBe(1);
    });

    it('não cria sessão quando o login falha', async () => {
      await criarUsuario();
      await autenticar(app, { password: 'senha-errada-mas-longa' });

      expect(await RefreshToken.countDocuments()).toBe(0);
    });

    it('rejeita payload inválido com 422', async () => {
      expect((await request(app).post('/api/auth/login').send({ email: 'x' })).status).toBe(422);
      expect((await request(app).post('/api/auth/login').send({})).status).toBe(422);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('renova a sessão e ROTACIONA o token', async () => {
      await criarUsuario();
      const { refreshCookie } = await autenticar(app);

      const response = await request(app).post('/api/auth/refresh').set('Cookie', refreshCookie);
      const novoCookie = extrairCookie(response);

      expect(response.status).toBe(200);
      expect(response.body.data.accessToken).toBeTruthy();
      expect(novoCookie).not.toBe(refreshCookie);
    });

    it('revoga o token anterior após a rotação', async () => {
      await criarUsuario();
      const { refreshCookie } = await autenticar(app);
      await request(app).post('/api/auth/refresh').set('Cookie', refreshCookie);

      const revogados = await RefreshToken.countDocuments({ revokedAt: { $ne: null } });
      expect(revogados).toBe(1);
    });

    it('DETECTA REUSO: reapresentar token revogado derruba todas as sessões', async () => {
      await criarUsuario();
      const { refreshCookie } = await autenticar(app);

      // Uso legítimo (rotaciona) e depois uma segunda sessão do mesmo usuário.
      await request(app).post('/api/auth/refresh').set('Cookie', refreshCookie);
      await autenticar(app);
      expect(await RefreshToken.countDocuments({ revokedAt: null })).toBe(2);

      // O token antigo reaparece: sinal de roubo.
      const response = await request(app).post('/api/auth/refresh').set('Cookie', refreshCookie);

      expect(response.status).toBe(401);
      expect(await RefreshToken.countDocuments({ revokedAt: null })).toBe(0);
    });

    it('rejeita cookie ausente, malformado ou com segredo trocado', async () => {
      await criarUsuario();
      const { refreshCookie } = await autenticar(app);
      const [jti] = refreshCookie.replace('motorshop_refresh=', '').split('.');

      expect((await request(app).post('/api/auth/refresh')).status).toBe(401);
      expect(
        (await request(app).post('/api/auth/refresh').set('Cookie', 'motorshop_refresh=lixo'))
          .status,
      ).toBe(401);
      expect(
        (
          await request(app)
            .post('/api/auth/refresh')
            .set('Cookie', `motorshop_refresh=${jti}.segredo-errado`)
        ).status,
      ).toBe(401);
    });

    it('rejeita refresh de usuário desativado depois do login', async () => {
      const user = await criarUsuario();
      const { refreshCookie } = await autenticar(app);

      await User.updateOne({ _id: user._id }, { active: false });

      expect(
        (await request(app).post('/api/auth/refresh').set('Cookie', refreshCookie)).status,
      ).toBe(401);
    });
  });

  describe('GET /api/auth/sessao (consulta do site, sem renovar)', () => {
    const consultar = (cookie) => {
      const req = request(app).get('/api/auth/sessao');
      return cookie ? req.set('Cookie', cookie) : req;
    };

    it('sem cookie: 200 com data null — não é erro, é o visitante comum', async () => {
      const res = await consultar();

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ success: true, data: null });
      expect(res.headers['cache-control']).toBe('no-store');
    });

    it('com sessão: só nome e papel, e o cookie NÃO é trocado nem revogado', async () => {
      await criarUsuario({ name: 'Dono da Loja', role: USER_ROLE.SUPER_ADMIN });
      const { refreshCookie } = await autenticar(app);

      // Várias abas ao mesmo tempo: nenhuma derruba a sessão.
      const respostas = await Promise.all([1, 2, 3].map(() => consultar(refreshCookie)));

      for (const res of respostas) {
        expect(res.body.data).toEqual({ name: 'Dono da Loja', role: USER_ROLE.SUPER_ADMIN });
        expect(res.headers['set-cookie']).toBeUndefined();
      }
      expect(await RefreshToken.countDocuments({ revokedAt: null })).toBe(1);
      // O mesmo cookie continua renovando normalmente no painel.
      expect(
        (await request(app).post('/api/auth/refresh').set('Cookie', refreshCookie)).status,
      ).toBe(200);
    });

    it('sessão encerrada, vencida, adulterada ou de usuário desativado: data null', async () => {
      const user = await criarUsuario();
      const { refreshCookie } = await autenticar(app);
      const [jti] = refreshCookie.replace('motorshop_refresh=', '').split('.');

      expect((await consultar(`motorshop_refresh=${jti}.segredo-errado`)).body.data).toBeNull();

      await User.updateOne({ _id: user._id }, { active: false });
      expect((await consultar(refreshCookie)).body.data).toBeNull();

      await User.updateOne({ _id: user._id }, { active: true });
      await RefreshToken.updateMany({}, { expiresAt: new Date(Date.now() - 1000) });
      expect((await consultar(refreshCookie)).body.data).toBeNull();

      await RefreshToken.updateMany({}, { revokedAt: new Date() });
      expect((await consultar(refreshCookie)).body.data).toBeNull();
      // Consultar token revogado não é tratado como roubo (não revoga nada a mais).
    });
  });

  describe('POST /api/auth/logout', () => {
    it('revoga a sessão e limpa o cookie', async () => {
      await criarUsuario();
      const { refreshCookie } = await autenticar(app);

      const response = await request(app).post('/api/auth/logout').set('Cookie', refreshCookie);

      expect(response.status).toBe(200);
      expect(await RefreshToken.countDocuments({ revokedAt: null })).toBe(0);
      expect(response.headers['set-cookie'].join(';')).toMatch(/motorshop_refresh=;/);
    });

    it('é idempotente — sem cookie não é erro', async () => {
      expect((await request(app).post('/api/auth/logout')).status).toBe(200);
    });
  });

  describe('GET /api/auth/me', () => {
    it('devolve o usuário autenticado sem dado sensível', async () => {
      await criarUsuario({ name: 'Maria', role: USER_ROLE.SUPER_ADMIN });
      const { accessToken } = await autenticar(app);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Maria');
      expect(response.body.data.role).toBe(USER_ROLE.SUPER_ADMIN);
      expect(response.body.data).not.toHaveProperty('passwordHash');
    });

    it('exige token', async () => {
      expect((await request(app).get('/api/auth/me')).status).toBe(401);
      expect(
        (await request(app).get('/api/auth/me').set('Authorization', 'Bearer lixo')).status,
      ).toBe(401);
      expect((await request(app).get('/api/auth/me').set('Authorization', 'lixo')).status).toBe(
        401,
      );
    });

    it('recusa token de usuário desativado DEPOIS da emissão', async () => {
      const user = await criarUsuario();
      const { accessToken } = await autenticar(app);

      await User.updateOne({ _id: user._id }, { active: false });

      // O token ainda é válido criptograficamente; o acesso cai mesmo assim.
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(401);
    });

    it('usa o papel do BANCO, não o do token — rebaixamento vale na hora', async () => {
      const user = await criarUsuario({ role: USER_ROLE.SUPER_ADMIN });
      const { accessToken } = await autenticar(app);

      await User.updateOne({ _id: user._id }, { role: USER_ROLE.ADMIN });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.body.data.role).toBe(USER_ROLE.ADMIN);
    });
  });

  it('não existe rota pública de cadastro', async () => {
    for (const rota of ['/api/auth/register', '/api/auth/signup', '/api/usuarios']) {
      expect((await request(app).post(rota).send({})).status).toBe(404);
    }
  });
});
