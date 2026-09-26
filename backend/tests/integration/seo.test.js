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

/** Build mínimo do site: o index.html com os marcadores, como o Vite gera. */
function buildFalso() {
  const dir = mkdtempSync(join(tmpdir(), 'motorshop-dist-'));
  mkdirSync(join(dir, 'assets'));
  writeFileSync(
    join(dir, 'index.html'),
    '<!doctype html><html lang="pt-BR"><head><!--seo--><title>MotorShop</title><!--/seo--></head><body><div id="root"></div><script type="module" src="/assets/index-abc.js"></script></body></html>',
  );
  writeFileSync(join(dir, 'assets', 'index-abc.js'), 'console.log(1)');
  writeFileSync(join(dir, 'favicon.svg'), '<svg/>');
  return dir;
}

const app = createApp({ frontendDir: buildFalso() });
/** Como o robô do WhatsApp: pede a página e lê o HTML, sem executar JS. */
const pagina = (path) => request(app).get(path).set('Host', 'loja.test').set('Accept', 'text/html');

describe.skipIf(skipWithoutDb)('SEO: HTML inicial por rota', () => {
  let moto;

  beforeAll(connect);
  afterAll(disconnect);

  beforeEach(async () => {
    await Promise.all([Moto.deleteMany({}), Brand.deleteMany({}), StoreSettings.deleteMany({})]);
    const honda = await Brand.create({ name: 'Honda', slug: 'honda' });
    await StoreSettings.create({
      name: 'Loja Exemplo',
      slogan: 'Motos revisadas',
      address: { city: 'Videira', state: 'SC' },
      contact: { phone: '4935655098' },
      features: { financingEnabled: true, sellMotoEnabled: false },
    });
    moto = await Moto.create({
      brand: honda._id,
      model: 'CB 500F',
      year: 2024,
      mileage: 12000,
      price: 3_890_000,
      engineCapacity: 471,
      fuel: 'GASOLINE',
      transmission: 'MANUAL',
      color: 'Vermelha',
      slug: 'honda-cb-500f-2024',
      description: 'Revisada</script><script>alert(1)</script>',
      images: [
        {
          id: 'f1',
          publicId: 'loja/motos/x/f1',
          url: 'https://res.cloudinary.com/loja/image/upload/v1/loja/motos/x/f1.jpg',
          width: 1600,
          height: 1200,
          order: 0,
        },
      ],
      mainImageId: 'f1',
    });
  });

  it('página da moto: título, descrição, og:image e canonical no HTML inicial (R-01)', async () => {
    const res = await pagina('/motos/honda-cb-500f-2024');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain(
      '<title data-seo>Honda CB 500F 2024 — 12.000 km | Loja Exemplo</title>',
    );
    expect(res.text).toMatch(/<meta name="description" content="Honda CB 500F: 2024, 12\.000 km/);
    expect(res.text).toContain(
      '<meta property="og:image" content="https://res.cloudinary.com/loja/image/upload/c_fill,g_auto,w_1200,h_630,f_jpg,q_auto/v1/loja/motos/x/f1.jpg" data-seo>',
    );
    expect(res.text).toContain(
      '<link rel="canonical" href="http://loja.test/motos/honda-cb-500f-2024" data-seo>',
    );
    expect(res.text).toContain('"availability":"https://schema.org/InStock"');
    expect(res.text).toContain('"@type":"BreadcrumbList"');
    expect(res.text).toContain('<div id="root"></div>'); // o SPA continua lá
  });

  it('embute loja e moto no HTML para o SPA não esperar a API (dados de partida)', async () => {
    const res = await pagina('/motos/honda-cb-500f-2024');
    const bloco = res.text.match(
      /<script type="application\/json" id="dados-iniciais">(.*?)<\/script>/s,
    );

    expect(bloco).not.toBeNull();
    const dados = JSON.parse(bloco[1]);
    expect(dados.store.name).toBe('Loja Exemplo');
    expect(dados.moto.slug).toBe('honda-cb-500f-2024');
    expect(dados.moto).not.toHaveProperty('licensePlate'); // mesma forma pública da API
  });

  it('pré-anuncia a foto principal com o mesmo srcset da galeria', async () => {
    const res = await pagina('/motos/honda-cb-500f-2024');
    expect(res.text).toMatch(
      /<link rel="preload" as="image" href="[^"]+w_1920\/v1\/loja\/motos\/x\/f1\.jpg" imagesrcset="[^"]+w_640\/v1\/loja\/motos\/x\/f1\.jpg 640w, [^"]+" imagesizes="\(min-width: 1024px\) 60vw, 100vw" fetchpriority="high">/,
    );
  });

  it('texto do banco no JSON-LD não vira script executável', async () => {
    const res = await pagina('/motos/honda-cb-500f-2024');
    expect(res.text).not.toContain('<script>alert(1)</script>');
    expect(res.text).toContain('\\u003c/script>');
  });

  it('usa o siteUrl configurado pela loja no canonical', async () => {
    await StoreSettings.updateOne({}, { seo: { siteUrl: 'https://www.loja-exemplo.com.br' } });
    const res = await pagina('/estoque');
    expect(res.text).toContain('href="https://www.loja-exemplo.com.br/estoque"');
  });

  it('moto vendida: 200, SoldOut e sem preço (decisão A)', async () => {
    await Moto.updateOne({ _id: moto._id }, { status: 'SOLD' });
    const res = await pagina('/motos/honda-cb-500f-2024');

    expect(res.status).toBe(200);
    expect(res.text).toContain('https://schema.org/SoldOut');
    expect(res.text).not.toContain('38.900');
    expect(res.text).not.toContain('38900'); // nem formatado, nem cru, em lugar nenhum
    const ld = JSON.parse(
      res.text.match(/<script type="application\/ld\+json" data-seo>(.*?)<\/script>/s)[1],
    );
    expect(ld.offers).not.toHaveProperty('price');
    const dados = JSON.parse(res.text.match(/id="dados-iniciais">(.*?)<\/script>/s)[1]);
    expect(dados.moto.price).toBeNull();
  });

  it('moto inativa ou inexistente: 404 com noindex', async () => {
    await Moto.updateOne({ _id: moto._id }, { status: 'INACTIVE' });
    for (const path of ['/motos/honda-cb-500f-2024', '/motos/nao-existe']) {
      const res = await pagina(path);
      expect(res.status, path).toBe(404);
      expect(res.text).toContain('<meta name="robots" content="noindex, follow" data-seo>');
    }
  });

  it('home com AutoDealer; catálogo filtrado com noindex e canonical sem filtro', async () => {
    const home = await pagina('/');
    expect(home.text).toContain('<title data-seo>Loja Exemplo | Motos revisadas</title>');
    expect(home.text).toContain('"@type":"AutoDealer"');

    const filtrado = await pagina('/estoque?marca=honda&precoMax=40000');
    expect(filtrado.text).toContain('<meta name="robots" content="noindex, follow" data-seo>');
    expect(filtrado.text).toContain(
      '<link rel="canonical" href="http://loja.test/estoque" data-seo>',
    );

    const semFiltro = await pagina('/estoque');
    expect(semFiltro.text).not.toContain('name="robots"');
  });

  it('página de módulo desligado é 404; ligado é 200', async () => {
    expect((await pagina('/venda-sua-moto')).status).toBe(404);
    expect((await pagina('/financiamento')).status).toBe(200);
  });

  it('painel nunca indexado; caminho desconhecido é 404', async () => {
    const admin = await pagina('/admin/motos');
    expect(admin.status).toBe(200);
    expect(admin.text).toContain('content="noindex, nofollow"');
    expect((await pagina('/qualquer-coisa')).status).toBe(404);
  });

  it('HTML sem cache; assets imutáveis; asset inexistente é 404 comum', async () => {
    expect((await pagina('/')).headers['cache-control']).toBe('no-cache');

    const asset = await request(app).get('/assets/index-abc.js');
    expect(asset.headers['cache-control']).toBe('public, max-age=31536000, immutable');

    const faltando = await request(app).get('/assets/nao-existe.js');
    expect(faltando.status).toBe(404);
    expect(faltando.headers['content-type']).toMatch(/json/);
  });

  it('o template cru não é servido por /index.html', async () => {
    const res = await request(app).get('/index.html');
    expect(res.status).toBe(301);
  });

  it('a API continua respondendo JSON, inclusive 404', async () => {
    const res = await request(app).get('/api/rota-que-nao-existe');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/json/);
  });

  it('sitemap.xml lista as páginas públicas e as motos, com lastmod', async () => {
    const res = await request(app).get('/sitemap.xml').set('Host', 'loja.test');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/xml/);
    expect(res.text).toContain('<loc>http://loja.test/</loc>');
    expect(res.text).toContain('<loc>http://loja.test/financiamento</loc>');
    expect(res.text).not.toContain('/venda-sua-moto'); // módulo desligado
    expect(res.text).toMatch(
      /<url><loc>http:\/\/loja\.test\/motos\/honda-cb-500f-2024<\/loc><lastmod>\d{4}-\d{2}-\d{2}T/,
    );
  });

  it('sitemap não lista moto inativa', async () => {
    await Moto.updateOne({ _id: moto._id }, { status: 'INACTIVE' });
    const res = await request(app).get('/sitemap.xml').set('Host', 'loja.test');
    expect(res.text).not.toContain('/motos/');
  });

  it('robots.txt bloqueia painel e API e aponta o sitemap', async () => {
    const res = await request(app).get('/robots.txt').set('Host', 'loja.test');
    expect(res.text).toBe(
      'User-agent: *\nDisallow: /admin\nDisallow: /api\n\nSitemap: http://loja.test/sitemap.xml\n',
    );
  });

  it('CSP libera só o necessário: fotos do CDN e envio ao provedor', async () => {
    const csp = (await pagina('/')).headers['content-security-policy'];
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("connect-src 'self' https://api.cloudinary.com");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it('POST da própria origem passa pelo CORS (site e API no mesmo processo)', async () => {
    const res = await request(app)
      .post('/api/leads')
      .set('Host', 'loja.test')
      .set('Origin', 'http://loja.test')
      .send({});
    expect(res.status).toBe(422); // chegou à validação, não foi barrado pelo CORS
  });

  it('logo da loja vira o ícone da aba em todo tipo de página; sem logo, o ícone padrão', async () => {
    const padrao = await pagina('/');
    expect(padrao.text).toContain('<link rel="icon" type="image/svg+xml" href="/favicon.svg">');

    await StoreSettings.updateOne(
      {},
      {
        logo: {
          id: 'l1',
          publicId: 'loja/logo',
          url: 'https://res.cloudinary.com/loja/image/upload/v1/loja/logo.png',
        },
      },
    );
    for (const caminho of ['/', '/estoque', '/motos/honda-cb-500f-2024', '/nao-existe']) {
      const res = await pagina(caminho);
      expect(res.text, caminho).toContain(
        '<link rel="icon" type="image/png" href="https://res.cloudinary.com/loja/image/upload/c_pad,w_64,h_64,f_png/v1/loja/logo.png">',
      );
      expect(res.text.match(/rel="icon"/g), caminho).toHaveLength(1);
    }
  });
});
