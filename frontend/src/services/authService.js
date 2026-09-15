import { api, setAccessToken } from './api.js';

/**
 * Operações de sessão. O access token é guardado em memória pelo `api.js`;
 * o refresh vive em cookie httpOnly e o JavaScript nunca o enxerga.
 */

export async function login({ email, password }) {
  const envelope = await api.post('/auth/login', { email, password });
  setAccessToken(envelope.data.accessToken);
  return envelope.data.user;
}

export async function logout() {
  try {
    await api.post('/auth/logout');
  } finally {
    setAccessToken(null);
  }
}

/** Recupera a sessão ao recarregar a página, usando o cookie de refresh. */
export async function restoreSession() {
  const envelope = await api.post('/auth/refresh');
  setAccessToken(envelope.data.accessToken);
  return envelope.data.user;
}

export async function fetchMe() {
  const envelope = await api.get('/auth/me');
  return envelope.data;
}
