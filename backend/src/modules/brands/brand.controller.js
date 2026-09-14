import { ok } from '../../utils/apiResponse.js';
import { serializeBrand, serializeBrandList } from './brand.serializer.js';
import * as service from './brand.service.js';

/** Traduz HTTP ⇄ domínio. Nenhuma regra de negócio aqui. */

export async function listPublic(req, res) {
  res.json(ok(serializeBrandList(await service.listPublic())));
}

export async function listAll(req, res) {
  res.json(ok(serializeBrandList(await service.listAll())));
}

export async function getById(req, res) {
  res.json(ok(serializeBrand(await service.getById(req.validated.params.id))));
}

export async function create(req, res) {
  const brand = await service.create(req.validated.body);
  res.status(201).json(ok(serializeBrand(brand), { message: 'Marca criada' }));
}

export async function update(req, res) {
  const brand = await service.update(req.validated.params.id, req.validated.body);
  res.json(ok(serializeBrand(brand), { message: 'Marca atualizada' }));
}

export async function remove(req, res) {
  await service.remove(req.validated.params.id);
  res.status(204).send();
}
