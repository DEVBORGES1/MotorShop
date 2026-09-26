import { randomUUID } from 'node:crypto';

import { MOTO_IMAGE_RULES } from '@motorshop/shared';

import { storageFolder } from '../../infra/storage/index.js';
import { ApiError } from '../../utils/ApiError.js';
import { destroyInBackground, requireStorage } from '../motos/moto.images.service.js';
import * as repository from './store.repository.js';
import { serializeStore } from './store.serializer.js';

/**
 * Logo e imagem de compartilhamento da loja — o que faltava para uma loja
 * nova ser configurada inteira pelo painel (teste de revenda, FASE 13).
 *
 * Mesmo fluxo das fotos das motos (ARCHITECTURE §10.4): o arquivo vai do
 * navegador direto ao provedor, com assinatura presa à pasta da loja; aqui
 * chegam só metadados, conferidos antes de gravar.
 */

const STORE_FOLDER = () => `${storageFolder}/loja`;

export function createSignature() {
  const storage = requireStorage();
  const upload = storage.createSignedUpload({
    folder: STORE_FOLDER(),
    allowedFormats: MOTO_IMAGE_RULES.FORMATS,
  });
  return {
    ...upload,
    maxBytes: MOTO_IMAGE_RULES.MAX_BYTES,
    allowedFormats: MOTO_IMAGE_RULES.FORMATS,
  };
}

const invalid = (field, message) =>
  new ApiError(422, 'Dados inválidos', [{ field, code: 'custom', message }]);

/** Grava o logo ou a imagem de compartilhamento; a anterior é apagada do provedor. */
export async function setImage(type, meta) {
  const storage = requireStorage();

  if (!meta.publicId.startsWith(`${STORE_FOLDER()}/`)) {
    throw invalid('publicId', 'O arquivo não pertence à pasta da loja');
  }
  if (!storage.verifyUpload(meta)) {
    throw invalid('signature', 'Não foi possível confirmar o envio ao provedor');
  }

  const before = await repository.findFull();
  const store = await repository.upsert({
    [type]: {
      id: randomUUID(),
      publicId: meta.publicId,
      url: storage.buildUrl(meta.publicId, { version: meta.version, format: meta.format }),
      width: meta.width,
      height: meta.height,
      alt: meta.alt ?? '',
      order: 0,
    },
  });

  const previous = before?.[type]?.publicId;
  if (previous && previous !== meta.publicId) destroyInBackground(previous, { store: type });
  return serializeStore(store);
}

export async function removeImage(type) {
  const before = await repository.findFull();
  const store = await repository.upsert({ [type]: null });
  if (before?.[type]?.publicId) destroyInBackground(before[type].publicId, { store: type });
  return serializeStore(store);
}
