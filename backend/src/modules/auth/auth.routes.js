import { Router } from 'express';

import { authenticate } from '../../middlewares/authenticate.js';
import { loginIpLimiter, loginLimiter, refreshLimiter } from '../../middlewares/rateLimiters.js';
import { requireDatabase } from '../../middlewares/requireDatabase.js';
import { validate } from '../../middlewares/validate.js';
import * as controller from './auth.controller.js';
import { loginSchema } from './auth.schema.js';

/**
 * Não existe rota de cadastro público. O primeiro SUPER_ADMIN nasce pelo script
 * `npm run create:superadmin`; os demais são criados por um SUPER_ADMIN
 * autenticado. Um endpoint aberto de registro seria a falha mais previsível
 * que este sistema poderia ter.
 */
export const authRoutes = Router();

authRoutes.post(
  '/login',
  requireDatabase,
  loginIpLimiter,
  loginLimiter,
  validate({ body: loginSchema }),
  controller.login,
);
authRoutes.post('/refresh', requireDatabase, refreshLimiter, controller.refresh);
authRoutes.post('/logout', requireDatabase, controller.logout);
authRoutes.get('/me', requireDatabase, authenticate, controller.me);
