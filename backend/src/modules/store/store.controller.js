import { ok } from '../../utils/apiResponse.js';
import * as service from './store.service.js';

export async function getPublic(req, res) {
  // A configuração muda raramente: cache curto evita ida ao banco a cada visita.
  res.set('Cache-Control', 'public, max-age=300');
  res.json(ok(await service.getPublic()));
}

export async function getFull(req, res) {
  res.json(ok(await service.getFull()));
}

export async function update(req, res) {
  res.json(ok(await service.update(req.validated.body), { message: 'Configurações salvas' }));
}
