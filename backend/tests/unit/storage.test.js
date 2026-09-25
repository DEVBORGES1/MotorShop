import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { parseEnv } from '../../src/config/env.js';
import { createCloudinaryProvider } from '../../src/infra/storage/cloudinary.provider.js';
import { assertStorageProvider, STORAGE_METHODS } from '../../src/infra/storage/storage.port.js';

const SEGREDO = 'segredo-de-teste';
const provedor = createCloudinaryProvider({
  cloudName: 'loja-teste',
  apiKey: '123456',
  apiSecret: SEGREDO,
});

/**
 * Assinatura do Cloudinary calculada de forma independente do SDK:
 * parâmetros em ordem alfabética, `chave=valor` unidos por `&`, seguidos do
 * segredo, em SHA-1.
 */
const assinar = (params) =>
  createHash('sha1')
    .update(
      Object.keys(params)
        .sort()
        .map((chave) => `${chave}=${params[chave]}`)
        .join('&') + SEGREDO,
    )
    .digest('hex');

describe('porta de armazenamento', () => {
  it('o provedor Cloudinary cumpre o contrato', () => {
    expect(() => assertStorageProvider(provedor)).not.toThrow();
    for (const metodo of STORAGE_METHODS) expect(typeof provedor[metodo]).toBe('function');
  });

  it('recusa provedor incompleto', () => {
    expect(() => assertStorageProvider({ buildUrl() {} })).toThrow(/createSignedUpload/);
  });
});

describe('createSignedUpload', () => {
  const assinado = provedor.createSignedUpload({
    folder: 'loja/motos/abc',
    allowedFormats: ['jpg', 'png', 'webp'],
  });

  it('assina pasta, formatos, limite de resolução e horário', () => {
    const { signature, api_key: _chave, ...assinados } = assinado.fields;

    expect(assinados).toMatchObject({
      folder: 'loja/motos/abc',
      allowed_formats: 'jpg,png,webp',
      transformation: 'c_limit,w_2560,h_2560',
    });
    expect(signature).toBe(assinar(assinados));
  });

  it('aponta o envio direto para o Cloudinary, não para a API', () => {
    expect(assinado.uploadUrl).toBe('https://api.cloudinary.com/v1_1/loja-teste/image/upload');
  });

  it('nunca expõe o segredo', () => {
    expect(JSON.stringify(assinado)).not.toContain(SEGREDO);
  });
});

describe('verifyUpload', () => {
  const prova = { publicId: 'loja/motos/abc/foto1', version: 1712345678 };

  it('aceita a assinatura que o Cloudinary produz', () => {
    const signature = assinar({ public_id: prova.publicId, version: prova.version });
    expect(provedor.verifyUpload({ ...prova, signature })).toBe(true);
  });

  it('recusa assinatura forjada, de outro arquivo ou ausente', () => {
    const deOutro = assinar({ public_id: 'loja/motos/xyz/foto', version: prova.version });
    expect(provedor.verifyUpload({ ...prova, signature: deOutro })).toBe(false);
    expect(provedor.verifyUpload({ ...prova, signature: 'a'.repeat(40) })).toBe(false);
    expect(provedor.verifyUpload({ ...prova, signature: 'curta' })).toBe(false);
    expect(provedor.verifyUpload({ ...prova, signature: undefined })).toBe(false);
  });
});

describe('buildUrl', () => {
  it('monta a URL canônica, sem telemetria na query', () => {
    expect(provedor.buildUrl('loja/motos/abc/foto1', { version: 17, format: 'jpg' })).toBe(
      'https://res.cloudinary.com/loja-teste/image/upload/v17/loja/motos/abc/foto1.jpg',
    );
  });
});

describe('configuração do armazenamento', () => {
  it('sem provedor é válido — o site funciona sem envio de fotos', () => {
    expect(parseEnv({}).data.STORAGE_PROVIDER).toBe('none');
  });

  it('cloudinary exige as três credenciais', () => {
    const resultado = parseEnv({ STORAGE_PROVIDER: 'cloudinary', CLOUDINARY_CLOUD_NAME: 'x' });
    expect(resultado.success).toBe(false);
    expect(resultado.issues.join()).toMatch(/CLOUDINARY_API_KEY/);
    expect(resultado.issues.join()).toMatch(/CLOUDINARY_API_SECRET/);
  });

  it('recusa pasta com caracteres que escapariam do escopo', () => {
    expect(parseEnv({ STORAGE_FOLDER: '../outra' }).success).toBe(false);
    expect(parseEnv({ STORAGE_FOLDER: 'loja-x/prod' }).success).toBe(true);
  });
});
