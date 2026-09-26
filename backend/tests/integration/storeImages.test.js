import { createHash } from 'node:crypto';

import { USER_ROLE } from '@motorshop/shared';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import { getStorage } from '../../src/infra/storage/index.js';
import { StoreSettings } from '../../src/modules/store/store.model.js';
import { User } from '../../src/modules/users/user.model.js';
import { criarLoja } from '../factories/index.js';
import { comToken, loginDeAdmin } from '../helpers/auth.js';
import { connect, disconnect, skipWithoutDb } from '../helpers/db.js';

const app = createApp();
const SEGREDO = 'segredo-apenas-para-testes'; // o mesmo do vitest.config.js
const PASTA = 'teste/loja';

/** Resposta de upload do provedor, assinada como o Cloudinary assina. */
function envio(publicId, extra = {}) {
  const version = 1_712_345_678;
  const signature = createHash('sha1')
    .update(`public_id=${publicId}&version=${version}${SEGREDO}`)
    .digest('hex');
  return {
    publicId,
    version,
    signature,
    format: 'png',
    bytes: 20_000,
    width: 600,
    height: 200,
    ...extra,
  };
}

describe.skipIf(skipWithoutDb)('logo e imagem de compartilhamento da loja', () => {
  let dono;
  let vendedor;

  beforeAll(connect);
  afterAll(disconnect);

  beforeEach(async () => {
    await Promise.all([User.deleteMany({}), StoreSettings.deleteMany({})]);
    await criarLoja({ name: 'Motos do Vale', legalName: 'Motos do Vale Comércio Ltda' });
    dono = await loginDeAdmin(app, USER_ROLE.SUPER_ADMIN);
    vendedor = await loginDeAdmin(app, USER_ROLE.ADMIN);
    vi.restoreAllMocks();
  });

  const pedir = (metodo, url, token = dono) => comToken(request(app)[metodo](url), token);

  it('assinatura presa à pasta da loja, sem cache', async () => {
    const res = await pedir('post', '/api/admin/store/imagens/assinatura');

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body.data.fields.folder).toBe(PASTA);
    expect(res.body.data.fields).not.toHaveProperty('api_secret');
  });

  it('grava o logo com URL montada pelo servidor e ele aparece no site público', async () => {
    const res = await pedir('put', '/api/admin/store/imagens/logo').send(envio(`${PASTA}/logo-1`));

    expect(res.status).toBe(200);
    expect(res.body.data.logo).toMatchObject({
      publicId: `${PASTA}/logo-1`,
      width: 600,
      height: 200,
    });
    expect(res.body.data.logo.url).toMatch(/^https:\/\/res\.cloudinary\.com\/.+logo-1\.png$/);

    const publica = await request(app).get('/api/store');
    expect(publica.body.data.logo.url).toBe(res.body.data.logo.url);
  });

  it('a imagem de compartilhamento e a razão social chegam ao site público', async () => {
    await pedir('put', '/api/admin/store/imagens/ogImage').send(envio(`${PASTA}/og-1`));

    const { body } = await request(app).get('/api/store');
    expect(body.data.ogImage.publicId).toBe(`${PASTA}/og-1`);
    expect(body.data.legalName).toBe('Motos do Vale Comércio Ltda');
  });

  it('trocar o logo apaga o anterior no provedor', async () => {
    const apagar = vi.spyOn(getStorage(), 'destroy').mockResolvedValue();
    await pedir('put', '/api/admin/store/imagens/logo').send(envio(`${PASTA}/logo-1`));

    await pedir('put', '/api/admin/store/imagens/logo').send(envio(`${PASTA}/logo-2`));

    expect(apagar).toHaveBeenCalledWith(`${PASTA}/logo-1`);
  });

  it('remover limpa o campo e apaga o arquivo', async () => {
    const apagar = vi.spyOn(getStorage(), 'destroy').mockResolvedValue();
    await pedir('put', '/api/admin/store/imagens/logo').send(envio(`${PASTA}/logo-1`));

    const res = await pedir('delete', '/api/admin/store/imagens/logo');

    expect(res.body.data.logo).toBeNull();
    expect(apagar).toHaveBeenCalledWith(`${PASTA}/logo-1`);
  });

  it('recusa arquivo de outra pasta, assinatura falsa e tipo desconhecido', async () => {
    const outraPasta = await pedir('put', '/api/admin/store/imagens/logo').send(
      envio('teste/motos/abc/foto-1'),
    );
    const falsa = await pedir('put', '/api/admin/store/imagens/logo').send({
      ...envio(`${PASTA}/logo-1`),
      signature: 'a'.repeat(40),
    });
    const tipo = await pedir('put', '/api/admin/store/imagens/favicon').send(envio(`${PASTA}/x`));

    expect([outraPasta.status, falsa.status, tipo.status]).toEqual([422, 422, 422]);
    expect((await StoreSettings.findOne().lean()).logo).toBeNull();
  });

  it('só o dono (SUPER_ADMIN) muda a identidade da loja', async () => {
    expect((await pedir('post', '/api/admin/store/imagens/assinatura', vendedor)).status).toBe(403);
    expect(
      (await pedir('put', '/api/admin/store/imagens/logo', vendedor).send(envio(`${PASTA}/l`)))
        .status,
    ).toBe(403);
    expect((await pedir('delete', '/api/admin/store/imagens/logo', vendedor)).status).toBe(403);
  });
});
