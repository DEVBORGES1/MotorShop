import { getDatabaseStatus } from '../../config/database.js';

/**
 * Monta o estado operacional da API.
 *
 * Deliberadamente não expõe versão, ambiente, host ou caminho: um health check
 * é público e não deve ajudar a mapear a infraestrutura.
 */
export function getHealthStatus() {
  return {
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: getDatabaseStatus(),
  };
}
