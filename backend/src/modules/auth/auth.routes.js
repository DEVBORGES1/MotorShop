import { Router } from 'express';

import { authenticate } from '../../middlewares/authenticate.js';
import {
  loginIpLimiter,
  loginLimiter,
  publicApiLimiter,
  refreshLimiter,
} from '../../middlewares/rateLimiters.js';
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
// Toda rota que consulta o banco tem limite, inclusive as de uso raro.
authRoutes.post('/logout', requireDatabase, publicApiLimiter, controller.logout);
// Consulta sem renovação, para o site público (limite do site, não o do refresh).
authRoutes.get('/sessao', requireDatabase, publicApiLimiter, controller.session);
authRoutes.get('/me', requireDatabase, publicApiLimiter, authenticate, controller.me);
