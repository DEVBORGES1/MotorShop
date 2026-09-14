import { Router } from 'express';

import { adminGuard } from '../middlewares/adminGuard.js';
import { requireDatabase } from '../middlewares/requireDatabase.js';
import { validate } from '../middlewares/validate.js';
import { brandAdminRoutes, brandPublicRoutes } from '../modules/brands/brand.routes.js';
import { healthRoutes } from '../modules/health/health.routes.js';
import * as motoController from '../modules/motos/moto.controller.js';
import { motoAdminRoutes, motoPublicRoutes } from '../modules/motos/moto.routes.js';
import { listMotosQuerySchema } from '../modules/motos/moto.schema.js';
import { ok } from '../utils/apiResponse.js';

export const apiRoutes = Router();

apiRoutes.get('/', (req, res) => {
  res.json(
    ok(
      { name: 'MotorShop API', health: '/api/health', catalog: '/api/motos' },
      { message: 'API is running' },
    ),
  );
});

apiRoutes.use('/health', healthRoutes);

// --- Público ---------------------------------------------------------------
// `requireDatabase` responde 503 de imediato quando o banco não está pronto,
// em vez de deixar a requisição esperar o timeout de buffer do Mongoose.
apiRoutes.use('/motos', requireDatabase, motoPublicRoutes);
apiRoutes.use('/marcas', requireDatabase, brandPublicRoutes);
apiRoutes.get(
  '/filtros',
  requireDatabase,
  validate({ query: listMotosQuerySchema }),
  motoController.getFilterRanges,
);

// --- Administrativo --------------------------------------------------------
// `adminGuard` é a trava provisória até a FASE 3 trazer `authenticate`.
apiRoutes.use('/admin', adminGuard, requireDatabase);
apiRoutes.use('/admin/motos', motoAdminRoutes);
apiRoutes.use('/admin/marcas', brandAdminRoutes);
