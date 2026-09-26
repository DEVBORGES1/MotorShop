import {
  absoluteUrl,
  breadcrumbJsonLd,
  coverImage,
  dealerJsonLd,
  iconUrl,
  imageAttributes,
  motoJsonLd,
  motoSeo,
  pageSeo,
  PUBLIC_DETAIL_STATUSES,
  shareImageUrl,
} from '@motorshop/shared';

import { getDatabaseStatus } from '../config/database.js';
import * as motoRepository from '../modules/motos/moto.repository.js';
import * as motoService from '../modules/motos/moto.service.js';
import * as storeService from '../modules/store/store.service.js';
import { cached } from './cache.js';
import { PAGE_FEATURE } from './routes.js';

/** Loja para o SEO. Banco fora do ar não derruba a página: vale o padrão. */
async function loadStore() {
  if (getDatabaseStatus().status !== 'connected') return { name: 'MotorShop', features: {} };
  return cached('store', () => storeService.getPublic());
}

async function loadMoto(slug) {
  if (getDatabaseStatus().status !== 'connected') return null;
  return cached(`moto:${slug}`, () => motoService.getBySlug(slug).catch(() => null));
}

/** Base das URLs absolutas: a configurada pela loja ou a da própria requisição. */
const siteBase = (store, requestOrigin) => store.seo?.siteUrl || requestOrigin;

/**
 * Tudo que a página precisa no `<head>` e o status HTTP.
 *
 * @param {{ page: string, slug?: string, filtered?: boolean }} route
 * @param {{ path: string, origin: string }} request
 */
export async function buildPageSeo(route, { path, origin }) {
  const store = await loadStore();
  const base = siteBase(store, origin);
  const home = absoluteUrl(base, '/');
  const siteName = store.name;
  // Ícone da aba: o logo da loja, quando houver.
  const icon = iconUrl(store.logo?.url) ?? null;
  const storeImage = shareImageUrl(store.ogImage?.url || store.logo?.url);

  // Dados que o SPA precisaria buscar logo ao abrir: vão junto no HTML
  // (`initialData`) e poupam uma ida à API antes da primeira pintura.
  const initialData = { store };

  const notFound = (data = initialData) => ({
    status: 404,
    initialData: data,
    seo: { ...pageSeo('not-found', store), canonical: absoluteUrl(base, path), siteName, icon },
  });

  if (route.page === 'moto') {
    const moto = await loadMoto(route.slug);
    // `moto: null` diz ao site que esta moto não existe: a página de "moto não
    // encontrada" sai renderizada, sem o navegador perguntar de novo à API.
    if (!moto) return notFound({ store, moto: null, motoSlug: route.slug });

    const canonical = absoluteUrl(base, `/motos/${moto.slug}`);
    return {
      status: 200,
      initialData: { store, moto, motoSlug: moto.slug },
      // A capa é o maior elemento da página: pedida já pelo HTML, em paralelo
      // com o JS, com o mesmo srcset que a galeria vai usar.
      imagePreload: imageAttributes(coverImage(moto), 'gallery'),
      seo: {
        ...motoSeo(moto, store),
        canonical,
        siteName,
        icon,
        image: shareImageUrl(coverImage(moto)?.url) ?? storeImage,
        jsonLd: [
          motoJsonLd(moto, store, canonical),
          breadcrumbJsonLd([
            { name: 'Home', url: home },
            { name: 'Estoque', url: absoluteUrl(base, '/estoque') },
            {
              name: [moto.brand?.name, moto.model, moto.year].filter(Boolean).join(' '),
              url: canonical,
            },
          ]),
        ],
      },
    };
  }

  const feature = PAGE_FEATURE[route.page];
  if (feature && !store.features?.[feature]) return notFound();
  if (route.page === 'not-found') return notFound();

  const meta = pageSeo(route.page, store);
  const canonicalPath = route.page === 'home' ? '/' : path;

  const jsonLd = [];
  if (route.page === 'home') jsonLd.push(dealerJsonLd(store, home));
  if (route.page === 'estoque') {
    jsonLd.push(
      breadcrumbJsonLd([
        { name: 'Home', url: home },
        { name: 'Estoque', url: absoluteUrl(base, '/estoque') },
      ]),
    );
  }

  return {
    status: 200,
    initialData,
    seo: {
      ...meta,
      robots: route.filtered ? 'noindex, follow' : meta.robots,
      canonical: absoluteUrl(base, canonicalPath),
      siteName,
      icon,
      image: storeImage,
      jsonLd,
    },
  };
}

/** Entradas do sitemap: páginas públicas e toda moto acessível por URL. */
export async function sitemapEntries(origin) {
  const store = await loadStore();
  const base = siteBase(store, origin);

  const pages = ['/', '/estoque', '/sobre', '/contato'];
  if (store.features?.financingEnabled) pages.push('/financiamento');
  if (store.features?.sellMotoEnabled) pages.push('/venda-sua-moto');

  const motos =
    getDatabaseStatus().status === 'connected'
      ? await cached('sitemap:motos', () => motoRepository.findForSitemap(PUBLIC_DETAIL_STATUSES))
      : [];

  return [
    ...pages.map((page) => ({ loc: absoluteUrl(base, page) })),
    ...motos.map((moto) => ({
      loc: absoluteUrl(base, `/motos/${moto.slug}`),
      lastmod: new Date(moto.updatedAt).toISOString(),
    })),
  ];
}

export async function sitemapBase(origin) {
  return siteBase(await loadStore(), origin);
}
