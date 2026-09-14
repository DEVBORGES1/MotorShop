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
});

// Entrega ao chamador o envelope da API ({ success, data, message, meta }) e
// converte qualquer falha em ApiClientError.
instance.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(normalizeApiError(error)),
);

export const api = instance;
