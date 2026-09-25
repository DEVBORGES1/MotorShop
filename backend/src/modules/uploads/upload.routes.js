import { Router } from 'express';

import { validate } from '../../middlewares/validate.js';
import * as controller from './upload.controller.js';
import { signatureSchema } from './upload.schema.js';

/** Montado sob `/admin`: exige usuário autenticado e ativo (§10.4). */
export const uploadRoutes = Router();
uploadRoutes.post('/assinatura', validate({ body: signatureSchema }), controller.createSignature);
