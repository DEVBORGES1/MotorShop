import mongoose from 'mongoose';

import { env } from './env.js';
import { logger } from './logger.js';

/**
 * Infraestrutura de conexão com o MongoDB.
 *
 * FASE 1 não define nenhum model — aqui existe apenas a conexão, seu ciclo de
 * vida e a leitura de estado consumida pelo health check.
 */

const READY_STATE = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

mongoose.connection.on('connected', () => logger.info('MongoDB conectado'));
mongoose.connection.on('disconnected', () => logger.warn('MongoDB desconectado'));
mongoose.connection.on('error', (error) => logger.error({ err: error }, 'Erro no MongoDB'));

/**
 * Estado atual da conexão, sem expor host, usuário ou credenciais.
 * @returns {{ status: string, configured: boolean }}
 */
export function getDatabaseStatus() {
  return {
    status: env.MONGODB_URI
      ? (READY_STATE[mongoose.connection.readyState] ?? 'unknown')
      : 'not_configured',
    configured: Boolean(env.MONGODB_URI),
  };
}

/**
 * Conecta ao MongoDB. Em produção a URI é obrigatória (validada em env.js),
 * então a ausência aqui só acontece em desenvolvimento/teste — caso em que a
 * API sobe sem banco e o health check reporta `not_configured`.
 */
export async function connectDatabase() {
  if (!env.MONGODB_URI) {
    logger.warn(
      'MONGODB_URI não definida — API iniciando sem banco de dados (apenas desenvolvimento)',
    );
    return false;
  }

  await mongoose.connect(env.MONGODB_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10_000,
  });

  return true;
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
