import { Router } from 'express';

import { validate } from '../../middlewares/validate.js';
import * as controller from './brand.controller.js';
import { createBrandSchema, objectIdParamSchema, updateBrandSchema } from './brand.schema.js';

/** Rotas públicas: somente leitura, e só marcas ativas. */
export const brandPublicRoutes = Router();

brandPublicRoutes.get('/', controller.listPublic);

/** Rotas administrativas: escrita e leitura completa (inclusive inativas). */
export const brandAdminRoutes = Router();

brandAdminRoutes.get('/', controller.listAll);
brandAdminRoutes.get('/:id', validate({ params: objectIdParamSchema }), controller.getById);
brandAdminRoutes.post('/', validate({ body: createBrandSchema }), controller.create);
brandAdminRoutes.patch(
  '/:id',
  validate({ params: objectIdParamSchema, body: updateBrandSchema }),
  controller.update,
);
brandAdminRoutes.delete('/:id', validate({ params: objectIdParamSchema }), controller.remove);
