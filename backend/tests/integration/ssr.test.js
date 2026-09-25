import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../src/app.js';
import { Brand } from '../../src/modules/brands/brand.model.js';
import { Moto } from '../../src/modules/motos/moto.model.js';
import { StoreSettings } from '../../src/modules/store/store.model.js';
import { connect, disconnect, skipWithoutDb } from '../helpers/db.js';

/**
 * Build falso com renderização no servidor: `dist/` (o site) e, ao lado,
 * `dist-ssr/entry-server.js` — um renderizador de mentira que devolve o que
 * recebeu, para o teste conferir o que o servidor passa e onde ele põe o HTML.
 * A renderização de verdade é testada no frontend (entry-server.test.jsx).
 */
function buildComSsr() {
  const raiz = mkdtempSync(join(tmpdir(), 'motorshop-ssr-'));
  const dist = join(raiz, 'dist');
  mkdirSync(dist);
  mkdirSync(join(raiz, 'dist-ssr'));
  writeFileSync(
    join(dist, 'index.html'),
    '<!doctype html><html><head><!--seo--><title>MotorShop</title><!--/seo--></head><body><div id="root"><!--app--></div></body></html>',
  );
  writeFileSync(
    join(raiz, 'dist-ssr', 'entry-server.js'),
    `export async function render({ url, dados }) {
       if (url.includes('quebra')) throw new Error('falha de propósito');
       return '<main data-ssr>' + [url, dados.store.name, dados.origem, dados.moto === null ? 'sem-moto' : dados.moto?.model ?? '-'].join('|') + '</main>';
     }
     export const estiloDoTema = (store) => store?.theme?.primary ? ':root{--color-brand-500:' + store.theme.primary + '}' : '';`,
  );
  return dist;
}

const app = createApp({ frontendDir: buildComSsr() });
const pagina = (path) => request(app).get(path).set('Host', 'loja.test').set('Accept', 'text/html');
const dadosIniciais = (html) =>
  JSON.parse(html.match(/<script type="application\/json" id="dados-iniciais">(.*?)<\/script>/)[1]);

describe.skipIf(skipWithoutDb)('renderização no servidor', () => {
  beforeAll(connect);
  afterAll(disconnect);

  beforeEach(async () => {
    await Promise.all([Moto.deleteMany({}), Brand.deleteMany({}), StoreSettings.deleteMany({})]);
    const honda = await Brand.create({ name: 'Honda', slug: 'honda' });
    await StoreSettings.create({ name: 'Loja Exemplo', theme: { primary: '#ff5500' } });
    await Moto.create({
      brand: honda._id,
      model: 'CB 500F',
      year: 2024,
      mileage: 1000,
      price: 3_890_000,
      engineCapacity: 471,
      fuel: 'GASOLINE',
      transmission: 'MANUAL',
      color: 'Vermelha',
      slug: 'honda-cb-500f-2024',
    });
  });

  it('põe a página renderizada dentro de #root, com a URL completa e a origem', async () => {
    const res = await pagina('/estoque?marca=honda');

    expect(res.status).toBe(200);
    expect(res.text).toContain(
      '<div id="root"><main data-ssr>http://loja.test/estoque?marca=honda|Loja Exemplo|http://loja.test|-</main></div>',
    );
  });

  it('o navegador recebe os mesmos dados, com a origem — senão a hidratação diverge', async () => {
    const res = await pagina('/');

    expect(dadosIniciais(res.text)).toMatchObject({
      store: { name: 'Loja Exemplo' },
      origem: 'http://loja.test',
    });
  });

  it('cores da loja no <head>, para a página já pintar com elas', async () => {
    const res = await pagina('/');

    expect(res.text).toContain('<style id="tema">:root{--color-brand-500:#ff5500}</style>');
  });

  it('página da moto recebe a moto; moto inexistente recebe null e responde 404', async () => {
    const existe = await pagina('/motos/honda-cb-500f-2024');
    expect(existe.text).toContain('|CB 500F</main>');
    expect(dadosIniciais(existe.text)).toMatchObject({ motoSlug: 'honda-cb-500f-2024' });

    const inexistente = await pagina('/motos/nao-existe');
    expect(inexistente.status).toBe(404);
    expect(inexistente.text).toContain('|sem-moto</main>');
    expect(dadosIniciais(inexistente.text)).toMatchObject({ moto: null, motoSlug: 'nao-existe' });
  });

  it('falha na renderização não derruba a página: sai como antes, para o navegador desenhar', async () => {
    const res = await pagina('/quebra');

    expect(res.status).toBe(404);
    expect(res.text).toContain('<div id="root"><!--app--></div>');
    expect(res.text).toContain('id="dados-iniciais"');
  });

  it('o painel não é renderizado no servidor', async () => {
    const res = await pagina('/admin/leads');

    expect(res.text).toContain('<div id="root"><!--app--></div>');
    expect(res.text).not.toContain('data-ssr');
  });
});
