import { ok } from '../../utils/apiResponse.js';
import * as service from './moto.service.js';

/** Traduz HTTP ⇄ domínio. Nenhuma regra de negócio aqui. */

export async function listPublic(req, res) {
  const { items, meta } = await service.listPublic(req.validated.query);
  res.json({ ...ok(items), meta });
}

export async function getBySlug(req, res) {
  res.json(ok(await service.getBySlug(req.validated.params.slug)));
}

export async function listSimilar(req, res) {
  res.json(ok(await service.listSimilar(req.validated.params.slug)));
}

export async function getFilterRanges(req, res) {
  res.json(ok(await service.getFilterRanges()));
}

export async function listAdmin(req, res) {
  const { items, meta } = await service.listAdmin(req.validated.query);
  res.json({ ...ok(items), meta });
}

export async function getByIdAdmin(req, res) {
  res.json(ok(await service.getByIdAdmin(req.validated.params.id)));
}

export async function create(req, res) {
  const moto = await service.create(req.validated.body);
  res.status(201).json(ok(moto, { message: 'Moto cadastrada' }));
}

export async function update(req, res) {
  const moto = await service.update(req.validated.params.id, req.validated.body);
  res.json(ok(moto, { message: 'Moto atualizada' }));
}

export async function changeStatus(req, res) {
  const moto = await service.changeStatus(req.validated.params.id, req.validated.body.status);
  res.json(ok(moto, { message: 'Status atualizado' }));
}

export async function deactivate(req, res) {
  const moto = await service.deactivate(req.validated.params.id);
  res.json(ok(moto, { message: 'Moto desativada' }));
}
