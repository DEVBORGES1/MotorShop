import { USER_ROLE } from '@motorshop/shared';
import { Router } from 'express';

import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import * as controller from './store.controller.js';
import { storeImageParamSchema, storeImageSchema, updateStoreSchema } from './store.schema.js';

/** Leitura pública: o site inteiro depende disso para não ter dado hardcoded. */
export const storePublicRoutes = Router();
storePublicRoutes.get('/', controller.getPublic);

/** Ler é de qualquer admin; alterar a identidade da loja é de SUPER_ADMIN. */
export const storeAdminRoutes = Router();
storeAdminRoutes.get('/', controller.getFull);
storeAdminRoutes.patch(
  '/',
  authorize(USER_ROLE.SUPER_ADMIN),
  validate({ body: updateStoreSchema }),
  controller.update,
);

// Logo e imagem de compartilhamento: identidade da loja, também de SUPER_ADMIN.
storeAdminRoutes.post(
  '/imagens/assinatura',
  authorize(USER_ROLE.SUPER_ADMIN),
  controller.imageSignature,
);
storeAdminRoutes.put(
  '/imagens/:tipo',
  authorize(USER_ROLE.SUPER_ADMIN),
  validate({ params: storeImageParamSchema, body: storeImageSchema }),
  controller.setImage,
);
storeAdminRoutes.delete(
  '/imagens/:tipo',
  authorize(USER_ROLE.SUPER_ADMIN),
  validate({ params: storeImageParamSchema }),
  controller.removeImage,
);
