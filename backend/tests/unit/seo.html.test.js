import { describe, expect, it } from 'vitest';

import { escapeHtml, injectApp, injectHead, renderHead } from '../../src/seo/html.js';
import { resolveRoute } from '../../src/seo/routes.js';

const seo = {
  title: 'Honda CB 500F 2024 | Loja',
  description: 'Ótima moto',
  ogType: 'product',
  canonical: 'https://loja.test/motos/honda',
  siteName: 'Loja',
  image: 'https://img.test/og.jpg',
  jsonLd: [{ '@type': 'Product', name: 'Honda' }],
};

describe('escape do HTML injetado (XSS)', () => {
  it('escapa os cinco caracteres perigosos', () => {
    expect(escapeHtml(`<script>"'&`)).toBe('&lt;script&gt;&quot;&#39;&amp;');
  });

  it('texto do banco não abre tag nem fecha atributo', () => {
    const malicioso = '"><script>alert(1)</script>';
    const head = renderHead({ ...seo, title: malicioso, description: malicioso });

    expect(head).not.toContain('<script>alert');
    expect(head).not.toMatch(/content=""><script/);
    expect(head).toContain('&quot;&gt;&lt;script&gt;');
  });

  it('JSON-LD com </script> na descrição não fecha a tag', () => {
    const head = renderHead({
      ...seo,
      jsonLd: [{ description: '</script><script>alert(1)</script>' }],
    });
    expect(head.match(/<\/script>/g)).toHaveLength(1); // só o fechamento legítimo
  });
});

describe('renderHead', () => {
  it('traz título, descrição, canonical, Open Graph, Twitter e JSON-LD', () => {
    const head = renderHead(seo);

    expect(head).toContain('<title data-seo>Honda CB 500F 2024 | Loja</title>');
    expect(head).toContain('<meta name="description" content="Ótima moto" data-seo>');
    expect(head).toContain('<link rel="canonical" href="https://loja.test/motos/honda" data-seo>');
    expect(head).toContain('<meta property="og:image" content="https://img.test/og.jpg" data-seo>');
    expect(head).toContain('<meta property="og:type" content="product" data-seo>');
    expect(head).toContain('<meta name="twitter:card" content="summary_large_image" data-seo>');
    expect(head).toContain('<script type="application/ld+json" data-seo>{"@type":"Product"');
  });

  it('sem imagem, card simples e sem og:image', () => {
    const head = renderHead({ ...seo, image: null });
    expect(head).not.toContain('og:image');
    expect(head).toContain('content="summary"');
  });
});

describe('injectHead', () => {
  const template = '<head><!--seo--><title>Padrão</title><!--/seo--></head>';

  it('troca só o bloco entre os marcadores', () => {
    const html = injectHead(template, '<title>Nova</title>');
    expect(html).toContain('<title>Nova</title>');
    expect(html).not.toContain('Padrão');
  });

  it('"$&" no título não vira padrão de substituição', () => {
    expect(injectHead(template, '<title>R$& 10</title>')).toContain('<title>R$& 10</title>');
  });

  it('falha alto se o template perdeu os marcadores', () => {
    expect(() => injectHead('<head></head>', 'x')).toThrow(/marcadores/);
  });
});

describe('resolveRoute', () => {
  const rota = (path, query = '') => resolveRoute(path, new URLSearchParams(query));

  it('reconhece as páginas do site', () => {
    expect(rota('/')).toEqual({ page: 'home', filtered: false });
    expect(rota('/estoque')).toEqual({ page: 'estoque', filtered: false });
    expect(rota('/contato/')).toEqual({ page: 'contato', filtered: false });
    expect(rota('/motos/honda-cb-500f-2024')).toEqual({ page: 'moto', slug: 'honda-cb-500f-2024' });
  });

  it('catálogo com filtro é marcado para noindex', () => {
    expect(rota('/estoque', 'marca=honda').filtered).toBe(true);
  });

  it('painel e caminhos desconhecidos', () => {
    expect(rota('/admin/motos')).toEqual({ page: 'admin' });
    expect(rota('/nao-existe')).toEqual({ page: 'not-found' });
    expect(rota('/motos/<script>')).toEqual({ page: 'not-found' });
  });
});

describe('dados de partida no HTML', () => {
  it('são bloco JSON não executável e não fecham a tag', () => {
    const head = renderHead(seo, { store: { name: '</script><script>alert(1)</script>' } });
    expect(head).toContain('<script type="application/json" id="dados-iniciais">');
    expect(head).not.toContain('<script>alert(1)');
  });
});

describe('renderização no servidor no HTML', () => {
  const template = '<body><div id="root"><!--app--></div></body>';

  it('injectApp troca o marcador pela página renderizada', () => {
    expect(injectApp(template, '<main>oi</main>')).toBe(
      '<body><div id="root"><main>oi</main></div></body>',
    );
  });

  it('sem HTML (painel, falha) o template fica intacto', () => {
    expect(injectApp(template, '')).toBe(template);
  });

  it('"$&" no conteúdo não vira padrão de substituição', () => {
    expect(injectApp(template, '<p>R$& 10</p>')).toContain('<p>R$& 10</p>');
  });

  it('cores da loja entram num <style>; "<" é removido — nada fecha a tag', () => {
    const head = renderHead(seo, null, [], null, ':root{--x:#fff}</style><script>');
    expect(head).toContain('<style id="tema">:root{--x:#fff}/style>script></style>');
    expect(renderHead(seo, null)).not.toContain('<style');
  });

  it('código da página com prioridade baixa: a página já vem pronta', () => {
    expect(renderHead(seo, null, ['/assets/a.js'])).toContain(
      '<link rel="modulepreload" href="/assets/a.js" fetchpriority="low">',
    );
  });
});
