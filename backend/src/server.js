import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { flushMonitoring, initMonitoring } from './config/monitoring.js';
import { createApp } from './app.js';

/**
 * Ponto de entrada do processo: conecta o banco, sobe o servidor HTTP e
 * encerra de forma ordenada.
 */
async function start() {
  if (initMonitoring()) logger.info('Monitoramento de erros ligado');
  if (!env.hasPersistentJwtSecret) {
    logger.warn(
      'JWT_SECRET não definida — um segredo temporário foi gerado. ' +
        'As sessões administrativas serão perdidas a cada reinício. ' +
        'Defina JWT_SECRET no .env para mantê-las.',
    );
  }

  await connectDatabase();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`API ouvindo na porta ${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = (signal) => {
    logger.info(`${signal} recebido — encerrando`);
    server.close(async () => {
      await flushMonitoring();
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((error) => {
  logger.error({ err: error }, 'Falha ao iniciar a API');
  process.exit(1);
});
