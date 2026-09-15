import { USER_ROLE } from '@motorshop/shared';
import { Router } from 'express';

import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import * as controller from './user.controller.js';
import { createUserSchema, updateUserSchema, userIdParamSchema } from './user.schema.js';

/**
 * Gestão de usuários é exclusiva de SUPER_ADMIN: quem pode criar contas pode
 * criar acesso para si mesmo, então é o poder mais sensível do sistema.
 */
export const userRoutes = Router();

userRoutes.use(authorize(USER_ROLE.SUPER_ADMIN));

userRoutes.get('/', controller.list);
userRoutes.get('/:id', validate({ params: userIdParamSchema }), controller.getById);
userRoutes.post('/', validate({ body: createUserSchema }), controller.create);
userRoutes.patch(
  '/:id',
  validate({ params: userIdParamSchema, body: updateUserSchema }),
  controller.update,
);
userRoutes.delete('/:id', validate({ params: userIdParamSchema }), controller.deactivate);
