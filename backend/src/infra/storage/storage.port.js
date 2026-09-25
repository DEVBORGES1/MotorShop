/**
 * Porta de armazenamento de imagens (ARCHITECTURE §10.3).
 *
 * Contrato que todo provedor cumpre. O domínio (serviços de moto e de upload)
 * fala só com isto; só o arquivo do provedor conhece o SDK. Trocar Cloudinary
 * por R2 + sharp é escrever outro provedor com os mesmos métodos.
 *
 * @typedef {object} SignedUpload
 * @property {string} uploadUrl  endereço para onde o NAVEGADOR envia o arquivo
 * @property {Record<string, string|number>} fields  campos do formulário
 *   multipart, a enviar junto do arquivo (`file`)
 * @property {string} folder  pasta a que a assinatura está presa
 *
 * @typedef {object} StorageProvider
 * @property {string} name
 * @property {(options: { folder: string, allowedFormats: string[] }) => SignedUpload} createSignedUpload
 * @property {(proof: { publicId: string, version: number|string, signature: string }) => boolean} verifyUpload
 *   confere que a resposta de upload veio mesmo do provedor (o navegador só a repassa)
 * @property {(publicId: string, options: { version?: number|string, format?: string }) => string} buildUrl
 *   URL canônica do arquivo, montada pelo servidor — nunca a que o cliente afirma
 * @property {(publicId: string) => Promise<void>} destroy
 */

export const STORAGE_METHODS = Object.freeze([
  'createSignedUpload',
  'verifyUpload',
  'buildUrl',
  'destroy',
]);

/** Falha cedo, no boot, se um provedor não cumpre o contrato. */
export function assertStorageProvider(provider) {
  const missing = STORAGE_METHODS.filter((method) => typeof provider?.[method] !== 'function');
  if (missing.length) {
    throw new Error(`Provedor de armazenamento incompleto: faltam ${missing.join(', ')}`);
  }
  return provider;
}
