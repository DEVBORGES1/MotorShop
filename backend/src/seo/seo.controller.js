import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { escapeHtml, injectApp, injectHead, renderHead } from './html.js';
import { createPreloader } from './preload.js';
import { resolveRoute } from './routes.js';
import { buildPageSeo, sitemapBase, sitemapEntries } from './seo.service.js';
import { createRenderer } from './ssr.js';

/** Origem da requisição (respeita o proxy: `trust proxy` está ligado). */
const originOf = (req) => `${req.protocol}://${req.get('host')}`;

/**
 * Serve o index.html com os metadados da rota no `<head>` e, nas páginas
 * públicas, a própria página já renderizada dentro de `#root`
 * (ARCHITECTURE §11.3). O React hidrata e assume a navegação depois.
 */
export function createHtmlHandler(frontendDir, { renderer = createRenderer(frontendDir) } = {}) {
  const template = readFileSync(join(frontendDir, 'index.html'), 'utf8');
  const preloadsFor = createPreloader(frontendDir);

  return async function servePage(req, res, next) {
    try {
      const route = resolveRoute(req.path, new URLSearchParams(req.query));
      const origin = originOf(req);
      const { status, seo, initialData, imagePreload } = await buildPageSeo(route, {
        path: req.path,
        origin,
      });
      // A origem vai junto: sem `window` no servidor, é dela que saem as URLs
      // absolutas (link do WhatsApp) — e o navegador precisa da mesma.
      const data = { ...initialData, origem: origin };

      // O painel não é renderizado no servidor: é privado e não tem o que
      // ganhar em SEO. Falha na renderização não derruba a página — ela sai
      // como antes, desenhada no navegador.
      let app = '';
      let theme = '';
      if (renderer && route.page !== 'admin') {
        try {
          ({ html: app, tema: theme } = await renderer({
            url: `${origin}${req.originalUrl}`,
            dados: data,
          }));
        } catch (error) {
          logger.warn({ err: error, path: req.path }, 'Renderização no servidor falhou');
        }
      }

      // Sem cache: o HTML carrega a meta do momento e aponta para os assets do
      // deploy atual (§12.4). Os assets, esses sim, são imutáveis.
      res.set('Cache-Control', 'no-cache');
      res
        .status(status)
        .type('html')
        .send(
          injectApp(
            injectHead(
              template,
              renderHead(
                seo,
                data,
                status === 200 ? preloadsFor(route.page) : [],
                imagePreload,
                theme,
              ),
            ),
            app,
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
