import { MOTO_IMAGE_RULES } from '@motorshop/shared';

import { folderForMoto, requireStorage } from '../motos/moto.images.service.js';
import { getByIdAdmin } from '../motos/moto.service.js';

/**
 * Assinatura para o navegador enviar fotos DIRETO ao provedor (§10.4).
 *
 * Escopada: vale só para a pasta da moto indicada (que precisa existir), só
 * para os formatos permitidos e por tempo limitado (1 h, regra do provedor).
 * O tamanho máximo segue junto para o navegador recusar antes de enviar; o
 * servidor confere de novo ao vincular.
 */
export async function createSignature({ motoId }) {
  const storage = requireStorage();
  await getByIdAdmin(motoId);

  const upload = storage.createSignedUpload({
    folder: folderForMoto(motoId),
    allowedFormats: MOTO_IMAGE_RULES.FORMATS,
  });

  return {
    ...upload,
    maxBytes: MOTO_IMAGE_RULES.MAX_BYTES,
    allowedFormats: MOTO_IMAGE_RULES.FORMATS,
  };
}
