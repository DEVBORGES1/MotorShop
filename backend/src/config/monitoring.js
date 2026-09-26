import * as Sentry from '@sentry/node';

import { env } from './env.js';

/**
 * Monitoramento de erros (Sentry). Sem ele, uma falha em produção só seria
 * descoberta quando um cliente reclamasse (ROADMAP, FASE 12).
 *
 * Só erro do servidor vai para lá — 4xx é o cliente errando, não o sistema.
 * E nada de dado pessoal: sem cabeçalhos (token, cookie), sem corpo (dados do
 * lead), sem IP. Só método, caminho e o `requestId`, que liga o evento ao log.
 */

let ativo = false;

/** Tira da requisição tudo que não seja método e caminho (sem query string). */
export function scrubEvent(event) {
  if (event.request) {
    const { method, url } = event.request;
    event.request = { method, url: url?.split('?')[0] };
  }
  delete event.user;
  return event;
}

/** Liga o Sentry, se houver DSN. Chamado uma vez, na partida do servidor. */
export function initMonitoring() {
  if (!env.SENTRY_DSN || env.isTest) return false;

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT ?? env.NODE_ENV,
    sendDefaultPii: false,
    // Só erros; desempenho fica com o Lighthouse e os logs.
    tracesSampleRate: 0,
    beforeSend: scrubEvent,
  });
  ativo = true;
  return true;
}

/** Registra um erro inesperado, com o `requestId` para achar o log. */
export function captureError(error, { requestId, path } = {}) {
  if (!ativo) return;
  Sentry.captureException(error, { tags: { requestId, path } });
}

/** Garante o envio dos eventos pendentes antes de o processo encerrar. */
export async function flushMonitoring() {
  if (ativo) await Sentry.close(2000);
}
