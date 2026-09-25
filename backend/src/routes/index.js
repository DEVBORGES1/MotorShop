import { Router } from 'express';

import { authenticate } from '../middlewares/authenticate.js';
import { adminApiLimiter, publicApiLimiter } from '../middlewares/rateLimiters.js';
import { requireDatabase } from '../middlewares/requireDatabase.js';
import { validate } from '../middlewares/validate.js';
import { authRoutes } from '../modules/auth/auth.routes.js';
import { brandAdminRoutes, brandPublicRoutes } from '../modules/brands/brand.routes.js';
import { healthRoutes } from '../modules/health/health.routes.js';
import { leadAdminRoutes, leadPublicRoutes } from '../modules/leads/lead.routes.js';
import * as motoController from '../modules/motos/moto.controller.js';
import { motoAdminRoutes, motoPublicRoutes } from '../modules/motos/moto.routes.js';
import { listMotosQuerySchema } from '../modules/motos/moto.schema.js';
import { storeAdminRoutes, storePublicRoutes } from '../modules/store/store.routes.js';
import { uploadRoutes } from '../modules/uploads/upload.routes.js';
import { userRoutes } from '../modules/users/user.routes.js';
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
apiRoutes.use('/auth', authRoutes);

// --- Público ---------------------------------------------------------------
// `requireDatabase` responde 503 de imediato quando o banco não está pronto,
// em vez de deixar a requisição esperar o timeout de buffer do Mongoose.
apiRoutes.use('/motos', publicApiLimiter, requireDatabase, motoPublicRoutes);
apiRoutes.use('/marcas', publicApiLimiter, requireDatabase, brandPublicRoutes);
apiRoutes.use('/store', publicApiLimiter, requireDatabase, storePublicRoutes);
// Sem o limitador geral: o de leads (5/hora) é o que vale, e fica na rota.
apiRoutes.use('/leads', requireDatabase, leadPublicRoutes);
apiRoutes.get(
  '/filtros',
  publicApiLimiter,
  requireDatabase,
  validate({ query: listMotosQuerySchema }),
  motoController.getFilterRanges,
);

// --- Administrativo --------------------------------------------------------
// Toda rota abaixo exige token válido de um usuário ATIVO. `authorize` entra
// por módulo, onde o papel exigido difere (usuários e configurações são de
// SUPER_ADMIN). Isto substitui a trava provisória da FASE 2.
apiRoutes.use('/admin', requireDatabase, authenticate, adminApiLimiter);
apiRoutes.use('/admin/motos', motoAdminRoutes);
apiRoutes.use('/admin/marcas', brandAdminRoutes);
apiRoutes.use('/admin/usuarios', userRoutes);
apiRoutes.use('/admin/store', storeAdminRoutes);
apiRoutes.use('/admin/leads', leadAdminRoutes);
apiRoutes.use('/admin/uploads', uploadRoutes);
