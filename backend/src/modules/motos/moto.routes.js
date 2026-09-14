import { Router } from 'express';

import { validate } from '../../middlewares/validate.js';
import * as controller from './moto.controller.js';
import {
  changeStatusSchema,
  createMotoSchema,
  idParamSchema,
  listMotosAdminQuerySchema,
  listMotosQuerySchema,
  slugParamSchema,
  updateMotoSchema,
} from './moto.schema.js';

/**
 * Rotas públicas.
 *
 * Não existe `GET /motos/:id` público: a URL canônica é por slug (melhor para
 * SEO) e a ausência do acesso por id reduz a enumeração do estoque.
 */
export const motoPublicRoutes = Router();

motoPublicRoutes.get('/', validate({ query: listMotosQuerySchema }), controller.listPublic);
motoPublicRoutes.get('/slug/:slug', validate({ params: slugParamSchema }), controller.getBySlug);
motoPublicRoutes.get(
  '/slug/:slug/similares',
  validate({ params: slugParamSchema }),
  controller.listSimilar,
);

/**
 * Rotas administrativas.
 *
 * Caminho separado do público de propósito: o código público não possui rota
 * capaz de devolver `licensePlate` ou moto `INACTIVE`, então não existe o
 * `if` esquecido que vazaria esses dados (ARCHITECTURE §8.4).
 */
export const motoAdminRoutes = Router();

motoAdminRoutes.get('/', validate({ query: listMotosAdminQuerySchema }), controller.listAdmin);
motoAdminRoutes.get('/:id', validate({ params: idParamSchema }), controller.getByIdAdmin);
motoAdminRoutes.post('/', validate({ body: createMotoSchema }), controller.create);
motoAdminRoutes.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateMotoSchema }),
  controller.update,
);
motoAdminRoutes.patch(
  '/:id/status',
  validate({ params: idParamSchema, body: changeStatusSchema }),
  controller.changeStatus,
);
// "Excluir" desativa (decisão D-06). Devolve o recurso atualizado, não 204.
motoAdminRoutes.delete('/:id', validate({ params: idParamSchema }), controller.deactivate);
