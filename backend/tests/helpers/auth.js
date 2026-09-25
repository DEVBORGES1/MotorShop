import { USER_ROLE } from '@motorshop/shared';
import request from 'supertest';

import { hashPassword } from '../../src/modules/auth/password.js';
import { User } from '../../src/modules/users/user.model.js';

// Sem as palavras da lista de senhas fracas (`user.schema.js`): a mesma senha
// serve para criar usuário pela API, que aplica essa regra.
export const SENHA_VALIDA = 'chave-de-teste-forte-2026';

export async function criarUsuario({
  name = 'Admin Teste',
  email = 'admin@teste.com',
  password = SENHA_VALIDA,
  role = USER_ROLE.ADMIN,
  active = true,
} = {}) {
  return User.create({ name, email, role, active, passwordHash: await hashPassword(password) });
}

/** Faz login e devolve o token e o cookie de refresh. */
export async function autenticar(app, { email = 'admin@teste.com', password = SENHA_VALIDA } = {}) {
  const response = await request(app).post('/api/auth/login').send({ email, password });

  return {
    response,
    accessToken: response.body.data?.accessToken,
    refreshCookie: extrairCookie(response),
  };
}

export function extrairCookie(response) {
  const cookies = response.headers['set-cookie'] ?? [];
  return cookies.find((cookie) => cookie.startsWith('motorshop_refresh='))?.split(';')[0] ?? null;
}

export const comToken = (req, token) => req.set('Authorization', `Bearer ${token}`);

/**
 * Cliente de teste já autenticado como administrador, para os testes das rotas
 * do painel. O token é lido na hora da chamada, porque só existe depois do
 * `beforeAll` que conecta ao banco e faz o login.
 */
export async function loginDeAdmin(app, role = USER_ROLE.ADMIN) {
  const email = `${role.toLowerCase()}-${Date.now()}@teste.com`;
  await criarUsuario({ email, role });
  return (await autenticar(app, { email })).accessToken;
}

export function clienteAdmin(app, obterToken) {
  const comAuth = (req) => req.set('Authorization', `Bearer ${obterToken()}`);
  return {
    get: (url) => comAuth(request(app).get(url)),
    post: (url) => comAuth(request(app).post(url)),
    patch: (url) => comAuth(request(app).patch(url)),
    delete: (url) => comAuth(request(app).delete(url)),
  };
}
