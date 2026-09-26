import { api, setAccessToken } from './api.js';

/**
 * Operações de sessão. O access token é guardado em memória pelo `api.js`;
 * o refresh vive em cookie httpOnly e o JavaScript nunca o enxerga.
 */

/**
 * Marca de que alguém da equipe já entrou **neste navegador**. Não é
 * credencial (não abre nada; o cookie de refresh é que prova a sessão): serve
 * só para o site público saber se vale tentar restaurar a sessão. Sem ela,
 * todo visitante dispararia uma renovação por visita e receberia 401.
 */
const MARCA_DE_ENTRADA = 'motorshop:equipe';

function marcarEntrada(entrou) {
  try {
    if (entrou) localStorage.setItem(MARCA_DE_ENTRADA, '1');
    else localStorage.removeItem(MARCA_DE_ENTRADA);
  } catch {
    // Armazenamento bloqueado (navegação privada restrita): o site só não
    // mostra os atalhos da equipe; o painel funciona normalmente.
  }
}

/** Alguém da equipe já entrou neste navegador (e ainda não saiu)? */
export function jaEntrouNesteNavegador() {
  try {
    return localStorage.getItem(MARCA_DE_ENTRADA) === '1';
  } catch {
    return false;
  }
}

/** A sessão acabou por outro caminho (renovação recusada): esquece a marca. */
export const esquecerEntrada = () => marcarEntrada(false);

export async function login({ email, password }) {
  const envelope = await api.post('/auth/login', { email, password });
  setAccessToken(envelope.data.accessToken);
  marcarEntrada(true);
  return envelope.data.user;
}

export async function logout() {
  try {
    await api.post('/auth/logout');
  } finally {
    setAccessToken(null);
    marcarEntrada(false);
  }
}

/** Recupera a sessão ao recarregar a página, usando o cookie de refresh. */
export async function restoreSession() {
  try {
    const envelope = await api.post('/auth/refresh');
    setAccessToken(envelope.data.accessToken);
    marcarEntrada(true);
    return envelope.data.user;
  } catch (erro) {
    marcarEntrada(false);
    throw erro;
  }
}

/**
 * Para o site público: quem da equipe está logado, **sem renovar a sessão**
 * (sem trocar token, sem gastar o limite de renovações, sem corrida entre
 * abas). `null` quando não há sessão — e aí a marca é esquecida.
 */
export async function consultarSessao() {
  const envelope = await api.get('/auth/sessao');
  if (!envelope.data) marcarEntrada(false);
  return envelope.data;
}

export async function fetchMe() {
  const envelope = await api.get('/auth/me');
  return envelope.data;
}
