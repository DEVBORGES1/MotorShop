import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { escapeHtml, injectHead, renderHead } from './html.js';
import { createPreloader } from './preload.js';
import { resolveRoute } from './routes.js';
import { buildPageSeo, sitemapBase, sitemapEntries } from './seo.service.js';

/** Origem da requisição (respeita o proxy: `trust proxy` está ligado). */
const originOf = (req) => `${req.protocol}://${req.get('host')}`;

/**
 * Serve o index.html do SPA com os metadados da rota já no `<head>`
 * (ARCHITECTURE §11.3). O React assume a navegação normalmente depois.
 */
export function createHtmlHandler(frontendDir) {
  const template = readFileSync(join(frontendDir, 'index.html'), 'utf8');
  const preloadsFor = createPreloader(frontendDir);

  return async function servePage(req, res, next) {
    try {
      const route = resolveRoute(req.path, new URLSearchParams(req.query));
      const { status, seo, initialData, imagePreload } = await buildPageSeo(route, {
        path: req.path,
        origin: originOf(req),
      });

      // Sem cache: o HTML carrega a meta do momento e aponta para os assets do
      // deploy atual (§12.4). Os assets, esses sim, são imutáveis.
      res.set('Cache-Control', 'no-cache');
      res
        .status(status)
        .type('html')
        .send(
          injectHead(
            template,
            renderHead(
              seo,
              initialData,
              status === 200 ? preloadsFor(route.page) : [],
              imagePreload,
            ),
          ),
        );
    } catch (error) {
      logger.error({ err: error, path: req.path }, 'Falha ao montar a página');
      next(error);
    }
  };
}

export async function sitemap(req, res) {
  const entries = await sitemapEntries(originOf(req));
  const urls = entries
    .map(
      (entry) =>
        `  <url><loc>${escapeHtml(entry.loc)}</loc>${
          entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : ''
        }</url>`,
    )
    .join('\n');

  res.set('Cache-Control', 'public, max-age=300');
  res
    .type('application/xml')
    .send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    );
}

/**
 * robots.txt por ambiente (§11.4). Em staging (`ROBOTS_POLICY=disallow`),
 * bloqueia tudo: a loja de demonstração não pode competir com o site real
 * no índice do Google.
 */
export async function robots(req, res) {
  const body =
    env.ROBOTS_POLICY === 'disallow'
      ? 'User-agent: *\nDisallow: /\n'
      : `User-agent: *\nDisallow: /admin\nDisallow: /api\n\nSitemap: ${(await sitemapBase(originOf(req))).replace(/\/+$/, '')}/sitemap.xml\n`;

  res.set('Cache-Control', 'public, max-age=3600');
  res.type('text/plain').send(body);
}
