import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { createApp } from './app.js';

/**
 * Ponto de entrada do processo: conecta o banco, sobe o servidor HTTP e
 * encerra de forma ordenada.
 */
async function start() {
  await connectDatabase();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`API ouvindo na porta ${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = (signal) => {
    logger.info(`${signal} recebido — encerrando`);
    server.close(async () => {
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
