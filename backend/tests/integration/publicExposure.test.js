import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { CONSENT_TEXT_VERSION, USER_ROLE } from '@motorshop/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../src/app.js';
import { Brand } from '../../src/modules/brands/brand.model.js';
import { Lead } from '../../src/modules/leads/lead.model.js';
import { Moto } from '../../src/modules/motos/moto.model.js';
import { StoreSettings } from '../../src/modules/store/store.model.js';
import { User } from '../../src/modules/users/user.model.js';
import { criarUsuario } from '../helpers/auth.js';
import { connect, disconnect, skipWithoutDb } from '../helpers/db.js';

/**
 * Varredura de campos sensíveis em TODA resposta pública (FASE 10).
 *
 * Em vez de conferir campo a campo em cada teste, percorre recursivamente o
 * corpo de cada resposta pública — inclusive os dados embutidos no HTML — e
 * falha se aparecer qualquer chave proibida ou um valor que só existe no banco.
 */
const CHAVES_PROIBIDAS = ['licensePlate', 'passwordHash', '_id', '__v', 'tokenHash', 'key'];
const PLACA = 'SEC1R23';

function chavesProibidas(valor, caminho = '$', achados = []) {
  if (Array.isArray(valor)) {
    valor.forEach((item, i) => chavesProibidas(item, `${caminho}[${i}]`, achados));
  } else if (valor && typeof valor === 'object') {
    for (const [chave, filho] of Object.entries(valor)) {
      if (CHAVES_PROIBIDAS.includes(chave)) achados.push(`${caminho}.${chave}`);
      chavesProibidas(filho, `${caminho}.${chave}`, achados);
    }
  }
  return achados;
}

function buildFalso() {
  const dir = mkdtempSync(join(tmpdir(), 'dist-'));
  writeFileSync(
    join(dir, 'index.html'),
    '<html><head><!--seo--><!--/seo--></head><body></body></html>',
  );
  return dir;
}

const app = createApp({ frontendDir: buildFalso() });

describe.skipIf(skipWithoutDb)('nenhuma resposta pública expõe dado interno', () => {
  const respostas = {};

  beforeAll(async () => {
    await connect();
    await Promise.all([
      Moto.deleteMany({}),
      Brand.deleteMany({}),
      StoreSettings.deleteMany({}),
      Lead.deleteMany({}),
      User.deleteMany({}),
    ]);
    await criarUsuario({ email: 'dono@loja.test', role: USER_ROLE.SUPER_ADMIN });
    await StoreSettings.create({ name: 'Loja', features: { financingEnabled: true } });
    const marca = await Brand.create({ name: 'Honda', slug: 'honda' });
    const base = {
      brand: marca._id,
      model: 'CB 500F',
      year: 2024,
      mileage: 100,
      price: 3_000_000,
      engineCapacity: 471,
      fuel: 'FLEX',
      transmission: 'MANUAL',
      color: 'Preta',
      licensePlate: PLACA,
      images: [{ id: 'f1', publicId: 'x/f1', url: 'https://img.test/f1.jpg', order: 0 }],
      mainImageId: 'f1',
    };
    await Moto.create({ ...base, slug: 'moto-a' });
    await Moto.create({ ...base, slug: 'moto-b', price: 3_100_000 });

    const publico = {
      '/api/motos': () => request(app).get('/api/motos'),
      '/api/motos/slug/moto-a': () => request(app).get('/api/motos/slug/moto-a'),
      '/api/motos/slug/moto-a/similares': () =>
        request(app).get('/api/motos/slug/moto-a/similares'),
      '/api/marcas': () => request(app).get('/api/marcas'),
      '/api/filtros': () => request(app).get('/api/filtros'),
      '/api/store': () => request(app).get('/api/store'),
      '/api/health': () => request(app).get('/api/health'),
      'POST /api/leads': () =>
        request(app)
          .post('/api/leads')
          .send({
            type: 'CONTACT',
            name: 'Maria',
            phone: '49 99999-8888',
            email: 'maria@exemplo.test',
            message: 'Olá, tudo bem?',
            consent: { accepted: true, textVersion: CONSENT_TEXT_VERSION },
          }),
    };
    for (const [nome, chamar] of Object.entries(publico)) respostas[nome] = await chamar();

    // Dados embutidos no HTML da página da moto (FASE 9).
    const html = await request(app).get('/motos/moto-a');
    const bloco = html.text.match(/id="dados-iniciais">(.*?)<\/script>/s)?.[1];
    respostas['HTML /motos/moto-a (dados-iniciais)'] = {
      status: html.status,
      body: JSON.parse(bloco),
    };
    respostas['HTML /motos/moto-a (texto)'] = { status: html.status, body: html.text };
  });
  afterAll(disconnect);

  it('todas as respostas públicas foram obtidas', () => {
    for (const [nome, res] of Object.entries(respostas)) {
      expect([200, 201], nome).toContain(res.status);
    }
  });

  it.each([
    '/api/motos',
    '/api/motos/slug/moto-a',
    '/api/motos/slug/moto-a/similares',
    '/api/marcas',
    '/api/filtros',
    '/api/store',
    '/api/health',
    'POST /api/leads',
    'HTML /motos/moto-a (dados-iniciais)',
  ])('%s: sem licensePlate, passwordHash, _id, __v, tokenHash, key', (nome) => {
    expect(chavesProibidas(respostas[nome].body)).toEqual([]);
  });

  it.each([
    '/api/motos',
    '/api/motos/slug/moto-a',
    '/api/motos/slug/moto-a/similares',
    'POST /api/leads',
    'HTML /motos/moto-a (texto)',
  ])('%s: nenhum valor sensível (placa, hash, telefone, e-mail)', (nome) => {
    const texto = JSON.stringify(respostas[nome].body);
    expect(texto).not.toContain(PLACA);
    expect(texto).not.toMatch(/\$argon2/);
    expect(texto).not.toMatch(/99999-?8888|maria@exemplo/);
  });

  it('health não revela versão, host nem nome do banco', () => {
    const texto = JSON.stringify(respostas['/api/health'].body);
    expect(texto).not.toMatch(
      /mongodb:\/\/|127\.0\.0\.1|localhost|motorshop_|"version"|node v?\d/i,
    );
  });
});
