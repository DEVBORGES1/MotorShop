import { ok } from '../../utils/apiResponse.js';
import * as service from './user.service.js';

export async function list(req, res) {
  res.json(ok(await service.list()));
}

export async function getById(req, res) {
  res.json(ok(await service.getById(req.validated.params.id)));
}

export async function create(req, res) {
  const user = await service.create(req.validated.body);
  res.status(201).json(ok(user, { message: 'Usuário criado' }));
}

export async function update(req, res) {
  const user = await service.update(req.validated.params.id, req.validated.body, req.user.id);
  res.json(ok(user, { message: 'Usuário atualizado' }));
}

export async function deactivate(req, res) {
  const user = await service.deactivate(req.validated.params.id, req.user.id);
  res.json(ok(user, { message: 'Usuário desativado' }));
}
