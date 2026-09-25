import { randomUUID } from 'node:crypto';

import { MOTO_LIMITS } from '@motorshop/shared';

import { logger } from '../../config/logger.js';
import { getStorage, storageFolder } from '../../infra/storage/index.js';
import { ApiError } from '../../utils/ApiError.js';
import * as repository from './moto.repository.js';
import { getByIdAdmin } from './moto.service.js';

/**
 * Fotos da moto (ARCHITECTURE §10.4 e §10.6).
 *
 * O arquivo vai do navegador direto ao provedor; aqui chegam só metadados, e
 * nenhum é aceito sem conferência: a assinatura prova que o upload aconteceu,
 * a pasta precisa ser a desta moto, e a URL gravada é montada pelo servidor.
 */

/** Pasta das fotos de uma moto no provedor. A assinatura de upload fica presa a ela. */
export const folderForMoto = (motoId) => `${storageFolder}/motos/${motoId}`;

export function requireStorage() {
  const storage = getStorage();
  if (!storage) {
    throw new ApiError(
      503,
      'Envio de fotos não configurado. Defina STORAGE_PROVIDER e as credenciais no .env.',
    );
  }
  return storage;
}

const invalid = (field, message) =>
  new ApiError(422, 'Dados inválidos', [{ field, code: 'custom', message }]);

export async function attachImage(motoId, meta) {
  const storage = requireStorage();
  const moto = await getByIdAdmin(motoId); // 404 antes de qualquer coisa

  // A assinatura de upload já restringe a pasta; conferir de novo aqui impede
  // vincular à moto A um arquivo enviado para a moto B.
  if (!meta.publicId.startsWith(`${folderForMoto(motoId)}/`)) {
    throw invalid('publicId', 'O arquivo não pertence à pasta desta moto');
  }

  if (!storage.verifyUpload(meta)) {
    throw invalid('signature', 'Não foi possível confirmar o envio da foto ao provedor');
  }

  // Reenvio do mesmo arquivo (rede instável, clique duplo): não duplica.
  if (moto.images.some((image) => image.publicId === meta.publicId)) return moto;

  const nextOrder = moto.images.reduce((max, image) => Math.max(max, image.order ?? 0), -1) + 1;
  const image = {
    id: randomUUID(),
    publicId: meta.publicId,
    url: storage.buildUrl(meta.publicId, { version: meta.version, format: meta.format }),
    width: meta.width,
    height: meta.height,
    alt: meta.alt ?? '',
    order: nextOrder,
  };

  const updated = await repository.pushImageIfRoom(motoId, image, MOTO_LIMITS.MAX_IMAGES);
  if (!updated) {
    throw new ApiError(422, `Limite de ${MOTO_LIMITS.MAX_IMAGES} fotos por moto atingido`);
  }

  await repository.setMainImageIfEmpty(motoId, image.id);
  return getByIdAdmin(motoId);
}

/** Nova ordem e foto principal, numa operação só. */
export async function reorderImages(motoId, { order, mainImageId }) {
  const moto = await getByIdAdmin(motoId);
  const porId = new Map(moto.images.map((image) => [image.id, image]));

  if (order.length !== porId.size || order.some((id) => !porId.has(id))) {
    throw new ApiError(
      409,
      'As fotos mudaram desde que a tela foi aberta. Recarregue e tente de novo.',
    );
  }

  const images = order.map((id, indice) => ({ ...porId.get(id), order: indice }));
  const updated = await repository.replaceImagesIfUnchanged(motoId, order, images, mainImageId);
  if (!updated) {
    throw new ApiError(
      409,
      'As fotos mudaram desde que a tela foi aberta. Recarregue e tente de novo.',
    );
  }

  return getByIdAdmin(motoId);
}

export async function updateImage(motoId, imageId, { alt }) {
  const updated = await repository.updateImageAlt(motoId, imageId, alt);
  if (!updated) throw ApiError.notFound('Foto não encontrada');
  return getByIdAdmin(motoId);
}

/**
 * Remove o metadado e pede ao provedor que apague o arquivo.
 *
 * A exclusão no provedor não bloqueia nem derruba a operação (§10.6): o
 * metadado sai na hora e a falha, se houver, é logada para reconciliação.
 * Arquivo órfão no CDN é problema menor que foto quebrada na página.
 */
export async function removeImage(motoId, imageId) {
  const antes = await repository.pullImage(motoId, imageId);
  if (!antes) {
    await getByIdAdmin(motoId); // moto inexistente → 404 da moto
    throw ApiError.notFound('Foto não encontrada');
  }

  const removida = antes.images.find((image) => image.id === imageId);

  // Era a principal: a próxima na ordem assume, para o card não ficar sem capa.
  if (antes.mainImageId === imageId) {
    const proxima = antes.images
      .filter((image) => image.id !== imageId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0];
    await repository.setMainImage(motoId, proxima?.id ?? null);
  }

  destroyInBackground(removida.publicId, { motoId: String(motoId), imageId });
  return getByIdAdmin(motoId);
}

function destroyInBackground(publicId, context) {
  const storage = getStorage();
  if (!storage) {
    logger.warn(
      { ...context, publicId },
      'Foto removida sem provedor configurado — arquivo mantido',
    );
    return;
  }

  storage.destroy(publicId).catch((error) => {
    logger.warn(
      { ...context, publicId, err: { message: error.message } },
      'Falha ao apagar foto no provedor — metadado já removido; arquivo precisa de reconciliação',
    );
  });
}
