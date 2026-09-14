import { api } from './api.js';

/**
 * @returns {Promise<{ status: string, uptime: number, timestamp: string, database: object }>}
 */
export async function fetchHealth() {
  const envelope = await api.get('/health');
  return envelope.data;
}
