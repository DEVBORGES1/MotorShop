import { USER_ROLE } from '@motorshop/shared';
import request from 'supertest';

import { hashPassword } from '../../src/modules/auth/password.js';
import { User } from '../../src/modules/users/user.model.js';

export const SENHA_VALIDA = 'senha-de-teste-forte-2026';

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
