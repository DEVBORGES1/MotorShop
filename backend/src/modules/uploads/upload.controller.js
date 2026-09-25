import { ok } from '../../utils/apiResponse.js';
import * as service from './upload.service.js';

export async function createSignature(req, res) {
  // Assinatura é credencial temporária: nunca em cache de proxy ou navegador.
  res.set('Cache-Control', 'no-store');
  res.json(ok(await service.createSignature(req.validated.body)));
}
