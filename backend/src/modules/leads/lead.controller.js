import { ok } from '../../utils/apiResponse.js';
import * as service from './lead.service.js';

/** Traduz HTTP ⇄ domínio. Nenhuma regra de negócio aqui. */

export async function create(req, res) {
  const lead = await service.create(req.validated.body);
  res.status(201).json(ok(lead, { message: 'Recebemos seu contato' }));
}

export async function list(req, res) {
  const { items, meta } = await service.list(req.validated.query);
  res.json({ ...ok(items), meta });
}

export async function getById(req, res) {
  res.json(ok(await service.getById(req.validated.params.id)));
}

export async function update(req, res) {
  const lead = await service.update(req.validated.params.id, req.validated.body, req.user);
  res.json(ok(lead, { message: 'Lead atualizado' }));
}

export async function remove(req, res) {
  await service.remove(req.validated.params.id, req.user);
  res.status(204).send();
}
