import { describe, expect, it } from 'vitest';

import { estiloDoTema, render } from './entry-server.jsx';

const ORIGEM = 'https://loja.exemplo';

const store = {
  name: 'Loja Teste',
  slogan: 'Motos revisadas no centro',
  theme: { primary: '#ff5500' },
  contact: { whatsapp: '49999990000' },
  address: { city: 'Chapecó', state: 'SC' },
  features: { financingEnabled: false, sellMotoEnabled: true },
};

const moto = {
  id: '6ab6c32742cc0d54bd391533',
  slug: 'honda-cb-500f-2024',
  brand: { name: 'Honda', slug: 'honda' },
  model: 'CB 500F',
  year: 2024,
  mileage: 4200,
  engineCapacity: 471,
  price: 38900,
  status: 'AVAILABLE',
  images: [],
  features: ['ABS'],
  description: 'Única dona. <script>alert(1)</script>',
};

const renderizar = (caminho, dados = {}) =>
  render({ url: `${ORIGEM}${caminho}`, dados: { store, origem: ORIGEM, ...dados } });

describe('render (renderização no servidor)', () => {
  it('home sai pronta, com os dados da loja e sem nenhum <script>', async () => {
    const html = await renderizar('/');

    expect(html).toContain('Motos revisadas no centro');
    expect(html).toContain('Loja Teste');
    // Qualquer script seria bloqueado pela CSP e quebraria a página.
    expect(html).not.toContain('<script');
  });

  it('página da moto sai com título, preço e ficha — e escapa o texto do banco', async () => {
    const html = await renderizar(`/motos/${moto.slug}`, { moto, motoSlug: moto.slug });

    expect(html).toMatch(/<h1[^>]*>Honda CB 500F<\/h1>/);
    expect(html).toContain('38.900');
    expect(html).toContain('Ficha técnica');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script');
  });

  it('o link do WhatsApp usa a origem da requisição (no servidor não há window)', async () => {
    const html = await renderizar(`/motos/${moto.slug}`, { moto, motoSlug: moto.slug });

    expect(html).toContain(encodeURIComponent(`${ORIGEM}/motos/${moto.slug}`));
  });

  it('moto inexistente sai como "moto não encontrada", sem carregando', async () => {
    const html = await renderizar('/motos/nao-existe', { moto: null, motoSlug: 'nao-existe' });

    expect(html).toContain('Moto não encontrada');
    expect(html).not.toContain('Carregando');
  });

  it('rota desconhecida sai como página não encontrada', async () => {
    const html = await renderizar('/pagina-que-nao-existe');

    expect(html).toContain('404');
  });

  it('páginas carregadas sob demanda saem renderizadas, não o "Carregando…"', async () => {
    const html = await renderizar('/sobre');

    expect(html).toContain('Loja Teste');
    expect(html).not.toContain('Carregando…');
  });
});

describe('estiloDoTema', () => {
  it('gera as variáveis da cor da loja', () => {
    expect(estiloDoTema(store)).toMatch(/^:root\{--color-brand-500:#ff5500;.+\}$/);
  });

  it('cor inválida ou ausente não gera nada — vale o tema padrão', () => {
    expect(estiloDoTema({ theme: { primary: 'red;}</style><script>' } })).toBe('');
    expect(estiloDoTema({})).toBe('');
    expect(estiloDoTema(undefined)).toBe('');
  });
});
