import { Router } from 'express';

import { healthRoutes } from '../modules/health/health.routes.js';
import { ok } from '../utils/apiResponse.js';

/**
 * Agregador das rotas da API. Módulos de domínio são montados aqui a partir
 * da FASE 2.
 */
export const apiRoutes = Router();

apiRoutes.get('/', (req, res) => {
  res.json(ok({ name: 'MotorShop API', health: '/api/health' }, { message: 'API is running' }));
});

apiRoutes.use('/health', healthRoutes);
