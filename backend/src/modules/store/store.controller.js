import { ok } from '../../utils/apiResponse.js';
import * as images from './store.images.service.js';
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

export function imageSignature(req, res) {
  // Assinatura é credencial temporária: nunca em cache.
  res.set('Cache-Control', 'no-store');
  res.json(ok(images.createSignature()));
}

export async function setImage(req, res) {
  res.json(ok(await images.setImage(req.validated.params.tipo, req.validated.body)));
}

export async function removeImage(req, res) {
  res.json(ok(await images.removeImage(req.validated.params.tipo)));
}
