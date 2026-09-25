import { env } from '../../config/env.js';
import { createCloudinaryProvider } from './cloudinary.provider.js';
import { assertStorageProvider } from './storage.port.js';

/**
 * Escolhe o provedor de armazenamento por `STORAGE_PROVIDER`.
 *
 * `none` é estado válido: o site inteiro funciona sem provedor, e só as rotas
 * de envio de foto respondem 503 — como a API sem banco configurado.
 */
function createStorage() {
  if (env.STORAGE_PROVIDER === 'cloudinary') {
    return assertStorageProvider(
      createCloudinaryProvider({
        cloudName: env.CLOUDINARY_CLOUD_NAME,
        apiKey: env.CLOUDINARY_API_KEY,
        apiSecret: env.CLOUDINARY_API_SECRET,
      }),
    );
  }
  return null;
}

const storage = createStorage();

/** @returns {import('./storage.port.js').StorageProvider | null} */
export const getStorage = () => storage;

/** Pasta-raiz no provedor; as fotos de cada moto ficam em `<raiz>/motos/<id>`. */
export const storageFolder = env.STORAGE_FOLDER;
