import { serializeJsonLd } from '@motorshop/shared';

/**
 * Montagem das tags de `<head>` injetadas no HTML inicial.
 *
 * SEGURANÇA: todo valor vem do banco (modelo, descrição, nome da loja) e é
 * escrito dentro de HTML. Sem escape, uma descrição com `"><script>` viraria
 * XSS armazenado na página pública — servido a todo visitante e a todo robô.
 * Atributos e textos passam por `escapeHtml`; JSON-LD, por `serializeJsonLd`.
 */

const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ENTITIES[c]);

const meta = (attr, key, content) =>
  content ? `<meta ${attr}="${key}" content="${escapeHtml(content)}" data-seo>` : null;

/**
 * @param {object} seo
 * @param {string} seo.title
 * @param {string} [seo.description]
 * @param {string} [seo.robots]
 * @param {string} seo.ogType
 * @param {string} seo.canonical  URL absoluta
 * @param {string} [seo.image]    URL absoluta da imagem de compartilhamento
 * @param {string} seo.siteName
 * @param {object[]} [seo.jsonLd]
 */
export function renderHead(seo, initialData, preloads = [], imagePreload = null, themeCss = '') {
  const tags = [
    `<title data-seo>${escapeHtml(seo.title)}</title>`,
    // Ícone da aba: o logo da loja (quadrado, PNG) ou o ícone padrão do produto.
    seo.icon
      ? `<link rel="icon" type="image/png" href="${escapeHtml(seo.icon)}">`
      : '<link rel="icon" type="image/svg+xml" href="/favicon.svg">',
    meta('name', 'description', seo.description),
    meta('name', 'robots', seo.robots),
    `<link rel="canonical" href="${escapeHtml(seo.canonical)}" data-seo>`,
    meta('property', 'og:site_name', seo.siteName),
    meta('property', 'og:locale', 'pt_BR'),
    meta('property', 'og:type', seo.ogType),
    meta('property', 'og:title', seo.title),
    meta('property', 'og:description', seo.description),
    meta('property', 'og:url', seo.canonical),
    meta('property', 'og:image', seo.image),
    seo.image ? meta('property', 'og:image:width', '1200') : null,
    seo.image ? meta('property', 'og:image:height', '630') : null,
    meta('name', 'twitter:card', seo.image ? 'summary_large_image' : 'summary'),
    meta('name', 'twitter:title', seo.title),
    meta('name', 'twitter:description', seo.description),
    meta('name', 'twitter:image', seo.image),
    ...(seo.jsonLd ?? []).map(
      (data) => `<script type="application/ld+json" data-seo>${serializeJsonLd(data)}</script>`,
    ),
    // Prioridade baixa: a página já vem pronta; o JS só a torna interativa.
    ...preloads.map(
      (href) => `<link rel="modulepreload" href="${escapeHtml(href)}" fetchpriority="low">`,
    ),
    imagePreload
      ? `<link rel="preload" as="image" href="${escapeHtml(imagePreload.src)}"${
          imagePreload.srcSet
            ? ` imagesrcset="${escapeHtml(imagePreload.srcSet)}" imagesizes="${escapeHtml(imagePreload.sizes)}"`
            : ''
        } fetchpriority="high">`
      : null,
    // Cores da loja, para a página renderizada no servidor já pintar certo.
    // Vêm de `estiloDoTema` (só aceita hexadecimal); `<` é removido por
    // garantia — nada pode fechar a tag.
    themeCss ? `<style id="tema">${themeCss.replace(/</g, '')}</style>` : null,
    // Dados de partida do SPA (loja, moto). `type="application/json"` é bloco
    // de dados: o navegador não executa, e a CSP segue sem script inline.
    initialData
      ? `<script type="application/json" id="dados-iniciais">${serializeJsonLd(initialData)}</script>`
      : null,
  ];

  return tags.filter(Boolean).join('\n    ');
}

const START = '<!--seo-->';
const END = '<!--/seo-->';

/**
 * Troca o bloco entre `<!--seo-->` e `<!--/seo-->` do index.html pelas tags
 * geradas. Os marcadores existem no template (frontend/index.html) com um
 * título padrão dentro, que é o que o Vite serve em desenvolvimento.
 */
export function injectHead(template, head) {
  const start = template.indexOf(START);
  const end = template.indexOf(END);
  if (start === -1 || end === -1) {
    throw new Error('index.html sem os marcadores <!--seo--> e <!--/seo-->');
  }
  // Fatiamento, não `replace`: um "$&" num título não pode virar padrão.
  return `${template.slice(0, start + START.length)}\n    ${head}\n    ${template.slice(end)}`;
}

const APP = '<!--app-->';

/**
 * Põe a página renderizada no servidor no lugar do marcador `<!--app-->`, dentro
 * de `#root`. Sem HTML (painel, falha, sem build), o template segue como está.
 */
export function injectApp(template, html) {
  if (!html) return template;
  const at = template.indexOf(APP);
  if (at === -1) return template;
  return `${template.slice(0, at)}${html}${template.slice(at + APP.length)}`;
}
