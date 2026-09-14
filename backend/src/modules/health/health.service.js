import { getDatabaseStatus } from '../../config/database.js';

/**
 * Monta o estado operacional da API.
 *
 * Deliberadamente não expõe versão, ambiente, host ou caminho: um health check
 * é público e não deve ajudar a mapear a infraestrutura.
 *
 * A partir da FASE 2 existem endpoints que dependem do banco, então a conexão
 * passa a fazer parte do critério de saúde: banco configurado porém fora do ar
 * significa API degradada, e o monitoramento precisa enxergar isso.
 */
export function getHealthStatus() {
  const database = getDatabaseStatus();
  const healthy = !database.configured || database.status === 'connected';

  return {
    status: healthy ? 'ok' : 'degraded',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database,
  };
}
