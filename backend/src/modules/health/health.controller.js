import { ok } from '../../utils/apiResponse.js';
import { getHealthStatus } from './health.service.js';

/**
 * O controller traduz domínio → HTTP. Nenhuma regra vive aqui.
 */
export function getHealth(req, res) {
  res.status(200).json(ok(getHealthStatus(), { message: 'API is running' }));
}
