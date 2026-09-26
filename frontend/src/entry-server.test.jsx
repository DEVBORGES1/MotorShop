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

  it('HTML do servidor é o de visitante: ícone leva ao login, nada da equipe (vai para o cache)', async () => {
    const html = await renderizar(`/motos/${moto.slug}`, { moto, motoSlug: moto.slug });

    const icone = html.match(/<a[^>]*aria-label="Área da equipe da loja"[^>]*>/)?.[0];
    expect(icone).toContain('href="/admin/login"');
    expect(html).not.toContain('Conectado como');
    expect(html).not.toContain('Editar');
  });

  it('diferenciais só aparecem se a loja os configurou — nenhuma promessa fixa no código', async () => {
    const sem = await renderizar('/');
    expect(sem).not.toContain('Troca aceita');
    expect(sem).not.toContain('Revisadas antes da vitrine');

    const com = await render({
      url: `${ORIGEM}/`,
      dados: { store: { ...store, highlights: [{ title: 'Garantia de 90 dias', text: null }] } },
    });
    expect(com).toContain('Garantia de 90 dias');
  });

  it('telefone da loja aparece com máscara no cabeçalho e no rodapé, e o link discado só com dígitos', async () => {
    const html = await render({
      url: `${ORIGEM}/`,
      dados: { store: { ...store, contact: { ...store.contact, phone: '4935550000' } } },
    });

    expect(html).toContain('(49) 3555-0000');
    expect(html).toContain('href="tel:4935550000"');
    expect(html).not.toContain('>4935550000<');
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
