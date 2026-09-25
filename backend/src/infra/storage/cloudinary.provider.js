import { timingSafeEqual } from 'node:crypto';

import { v2 as cloudinary } from 'cloudinary';

/**
 * Provedor Cloudinary. ÚNICO arquivo do projeto que importa `cloudinary`
 * (ARCHITECTURE §10.3).
 *
 * Assinar, verificar e montar URL são cálculos locais (SHA-1 com o segredo);
 * só `destroy` fala com a API do Cloudinary.
 *
 * @param {{ cloudName: string, apiKey: string, apiSecret: string }} credentials
 * @returns {import('./storage.port.js').StorageProvider}
 */
export function createCloudinaryProvider({ cloudName, apiKey, apiSecret }) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
    // Sem o parâmetro de telemetria `?_a=` que o SDK acrescenta às URLs.
    urlAnalytics: false,
  });

  const sign = (params) => cloudinary.utils.api_sign_request(params, apiSecret);

  return {
    name: 'cloudinary',
    /** Origem para onde o navegador envia as fotos (liberada na CSP). */
    uploadOrigin: 'https://api.cloudinary.com',

    /**
     * Assinatura de upload direto. Os parâmetros assinados viram restrições
     * que o Cloudinary impõe: o arquivo só entra na `folder` indicada, só nos
     * formatos listados, e é reduzido a no máximo 2560 px no lado maior
     * (fotos de celular chegam com 4000+ px — ninguém precisa disso na web).
     * Alterar qualquer campo invalida a assinatura. Vale por 1 hora.
     */
    createSignedUpload({ folder, allowedFormats }) {
      const params = {
        timestamp: Math.floor(Date.now() / 1000),
        folder,
        allowed_formats: allowedFormats.join(','),
        transformation: 'c_limit,w_2560,h_2560',
      };

      return {
        uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        fields: { ...params, api_key: apiKey, signature: sign(params) },
        folder,
      };
    },

    /**
     * A resposta de upload do Cloudinary traz `signature` = SHA-1 de
     * `public_id` + `version` + segredo. Só quem tem o segredo produz esse
     * valor: um navegador não inventa um upload que não aconteceu.
     */
    verifyUpload({ publicId, version, signature }) {
      if (!publicId || version == null || typeof signature !== 'string') return false;

      const expected = Buffer.from(sign({ public_id: publicId, version }));
      const received = Buffer.from(signature);
      return expected.length === received.length && timingSafeEqual(expected, received);
    },

    buildUrl(publicId, { version, format } = {}) {
      return cloudinary.url(publicId, { version, format, secure: true });
    },

    async destroy(publicId) {
      const result = await cloudinary.uploader.destroy(publicId, { invalidate: true });
      // "not found" também é sucesso: o objetivo (arquivo ausente) foi atingido.
      if (result?.result !== 'ok' && result?.result !== 'not found') {
        throw new Error(`Cloudinary não confirmou a exclusão: ${result?.result ?? 'sem resposta'}`);
      }
    },
  };
}
