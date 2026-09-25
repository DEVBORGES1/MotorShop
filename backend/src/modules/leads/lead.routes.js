import { createLeadSchema, USER_ROLE } from '@motorshop/shared';
import { Router } from 'express';

import { authorize } from '../../middlewares/authorize.js';
import { leadLimiter } from '../../middlewares/rateLimiters.js';
import { validate } from '../../middlewares/validate.js';
import * as controller from './lead.controller.js';
import {
  bulkDeleteLeadsSchema,
  leadIdParamSchema,
  listLeadsQuerySchema,
  updateLeadSchema,
} from './lead.schema.js';

/**
 * Público: só criar. O limitador vem antes da validação — envio inválido
 * também conta, senão um robô testaria formatos à vontade.
 */
export const leadPublicRoutes = Router();
leadPublicRoutes.post('/', leadLimiter, validate({ body: createLeadSchema }), controller.create);

/** Painel: ler e trabalhar o lead é de qualquer admin; excluir é de SUPER_ADMIN. */
export const leadAdminRoutes = Router();
leadAdminRoutes.get('/', validate({ query: listLeadsQuerySchema }), controller.list);
// POST e não DELETE com corpo: proxies e clientes HTTP podem descartar o corpo
// de um DELETE.
leadAdminRoutes.post(
  '/exclusao',
  authorize(USER_ROLE.SUPER_ADMIN),
  validate({ body: bulkDeleteLeadsSchema }),
  controller.removeMany,
);
leadAdminRoutes.get('/:id', validate({ params: leadIdParamSchema }), controller.getById);
leadAdminRoutes.patch(
  '/:id',
  validate({ params: leadIdParamSchema, body: updateLeadSchema }),
  controller.update,
);
leadAdminRoutes.delete(
  '/:id',
  authorize(USER_ROLE.SUPER_ADMIN),
  validate({ params: leadIdParamSchema }),
  controller.remove,
);
