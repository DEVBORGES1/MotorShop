import axios from 'axios';

import { apiBaseUrl } from '@/config/env.js';

/**
 * Camada de acesso HTTP. É o único lugar do frontend que conhece Axios.
 */

/** Erro normalizado da API, com mensagem já apresentável ao usuário. */
export class ApiClientError extends Error {
  constructor(message, { status = null, errors = [] } = {}) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.errors = errors;
  }
}

/**
 * Converte qualquer falha do Axios em um erro previsível.
 * Exportada para teste — é lógica com regra própria, não encanamento.
 *
 * @param {unknown} error
 * @returns {ApiClientError}
 */
export function normalizeApiError(error) {
  if (error?.response) {
    const { status, data } = error.response;
    return new ApiClientError(data?.message ?? `Erro ${status} ao consultar a API`, {
      status,
      errors: data?.errors ?? [],
    });
  }

  if (error?.request) {
    return new ApiClientError(
      'Não foi possível conectar à API. Verifique se o servidor está no ar.',
    );
  }

  return new ApiClientError(error?.message ?? 'Erro inesperado ao consultar a API');
}

const instance = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
  // Necessário para o cookie httpOnly do refresh token trafegar.
  withCredentials: true,
});

/**
 * Access token em MEMÓRIA, nunca em localStorage.
 *
 * `localStorage` é legível por qualquer script: um XSS entregaria uma sessão
 * administrativa completa. Em memória, a exposição morre com a aba.
 */
let accessToken = null;
let onSessionLost = null;

export const setAccessToken = (token) => {
  accessToken = token;
};
export const getAccessToken = () => accessToken;
export const setSessionLostHandler = (handler) => {
  onSessionLost = handler;
};

instance.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

/**
 * Uma única renovação em voo por vez.
 *
 * Sem isto, N requisições que recebem 401 ao mesmo tempo disparariam N
 * refreshes — e a rotação de tokens no servidor interpretaria os extras como
 * reuso de token roubado, derrubando todas as sessões do usuário.
 */
let renovacaoEmVoo = null;

async function renovarSessao() {
  renovacaoEmVoo ??= instance
    .post('/auth/refresh', null, { skipAuthRefresh: true })
    .then((envelope) => {
      setAccessToken(envelope.data.accessToken);
      return envelope.data;
    })
    .finally(() => {
      renovacaoEmVoo = null;
    });

  return renovacaoEmVoo;
}

// Entrega ao chamador o envelope da API ({ success, data, message, meta }) e
// converte qualquer falha em ApiClientError.
instance.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const config = error.config ?? {};
    const ehRotaDeAuth = String(config.url ?? '').startsWith('/auth/');

    // 401 em requisição autenticada: tenta renovar UMA vez e repete.
    if (error.response?.status === 401 && !config.skipAuthRefresh && !ehRotaDeAuth) {
      try {
        await renovarSessao();
        return await instance({ ...config, skipAuthRefresh: true });
      } catch {
        setAccessToken(null);
        onSessionLost?.();
      }
    }

    return Promise.reject(normalizeApiError(error));
  },
);

export const api = instance;
