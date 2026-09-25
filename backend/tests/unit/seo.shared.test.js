import {
  breadcrumbJsonLd,
  dealerJsonLd,
  motoJsonLd,
  motoSeo,
  pageSeo,
  serializeJsonLd,
  shareImageUrl,
  truncate,
} from '@motorshop/shared';
import { describe, expect, it } from 'vitest';

const loja = {
  name: 'Loja Exemplo',
  slogan: 'Motos revisadas com garantia',
  address: { street: 'Rua A', number: '10', city: 'Videira', state: 'SC', zipCode: '89560-000' },
  contact: { phone: '(49) 3565-5098', email: 'contato@loja.test' },
  businessHours: [
    { weekday: 1, opensAt: '08:00', closesAt: '18:00', closed: false },
    { weekday: 0, closed: true },
  ],
  social: { instagram: 'https://instagram.com/loja' },
};

const moto = {
  brand: { name: 'Honda' },
  model: 'CB 500F',
  version: 'ABS',
  year: 2024,
  mileage: 12000,
  engineCapacity: 471,
  fuel: 'GASOLINE',
  transmission: 'MANUAL',
  color: 'Vermelha',
  price: 38900,
  status: 'AVAILABLE',
  images: [
    { id: 'a', url: 'https://res.cloudinary.com/x/image/upload/v1/a.jpg', order: 0 },
    { id: 'b', url: 'https://res.cloudinary.com/x/image/upload/v1/b.jpg', order: 1 },
  ],
  mainImageId: 'b',
};

describe('truncate', () => {
  it('corta sem partir palavra e põe reticências', () => {
    expect(truncate('uma frase comprida demais para caber', 20)).toBe('uma frase comprida…');
    expect(truncate('curta', 20)).toBe('curta');
  });
});

describe('motoSeo', () => {
  it('título com modelo, ano e km, loja no fim', () => {
    expect(motoSeo(moto, loja).title).toBe('Honda CB 500F ABS 2024 — 12.000 km | Loja Exemplo');
  });

  it('descrição com ficha, preço e cidade, até 160 caracteres', () => {
    const { description } = motoSeo(moto, loja);
    expect(description).toMatch(/2024, 12\.000 km, 471 cc, Gasolina/);
    expect(description).toMatch(/R\$\s38\.900,00/);
    expect(description.length).toBeLessThanOrEqual(160);
  });

  it('moto vendida não anuncia preço', () => {
    const { description } = motoSeo({ ...moto, status: 'SOLD', price: null }, loja);
    expect(description).toContain('Vendida');
    expect(description).not.toContain('R$');
  });
});

describe('pageSeo', () => {
  it('usa a configuração da loja, nunca texto de outra loja', () => {
    expect(pageSeo('home', loja).title).toBe('Loja Exemplo | Motos revisadas com garantia');
    expect(pageSeo('estoque', loja).description).toContain('em Videira - SC');
  });

  it('título e descrição de SEO configurados têm prioridade', () => {
    const comSeo = {
      ...loja,
      seo: { defaultTitle: 'Título próprio', defaultDescription: 'Descrição própria' },
    };
    expect(pageSeo('home', comSeo)).toMatchObject({
      title: 'Título próprio',
      description: 'Descrição própria',
    });
  });

  it('painel e página inexistente não são indexados', () => {
    expect(pageSeo('admin', loja).robots).toBe('noindex, nofollow');
    expect(pageSeo('not-found', loja).robots).toBe('noindex, follow');
  });
});

describe('shareImageUrl', () => {
  it('gera 1200×630 em JPG para o preview', () => {
    expect(shareImageUrl('https://res.cloudinary.com/x/image/upload/v1/a.jpg')).toBe(
      'https://res.cloudinary.com/x/image/upload/c_fill,g_auto,w_1200,h_630,f_jpg,q_auto/v1/a.jpg',
    );
  });

  it('URL de fora do provedor volta como veio', () => {
    expect(shareImageUrl('https://exemplo.com/a.jpg')).toBe('https://exemplo.com/a.jpg');
    expect(shareImageUrl(null)).toBeNull();
  });
});

describe('JSON-LD', () => {
  it('moto como Product + Motorcycle, capa primeiro, oferta em estoque', () => {
    const ld = motoJsonLd(moto, loja, 'https://loja.test/motos/x');

    expect(ld['@type']).toEqual(['Product', 'Motorcycle']);
    expect(ld.image[0]).toContain('/b.jpg');
    expect(ld.mileageFromOdometer).toEqual({
      '@type': 'QuantitativeValue',
      value: 12000,
      unitCode: 'KMT',
    });
    expect(ld.offers).toMatchObject({
      price: 38900,
      priceCurrency: 'BRL',
      availability: 'https://schema.org/InStock',
      seller: { '@type': 'AutoDealer', name: 'Loja Exemplo' },
    });
  });

  it('reservada → LimitedAvailability; vendida → SoldOut sem preço', () => {
    expect(motoJsonLd({ ...moto, status: 'RESERVED' }, loja, 'u').offers.availability).toBe(
      'https://schema.org/LimitedAvailability',
    );
    const vendida = motoJsonLd({ ...moto, status: 'SOLD', price: null }, loja, 'u');
    expect(vendida.offers.availability).toBe('https://schema.org/SoldOut');
    expect(vendida.offers).not.toHaveProperty('price');
  });

  it('não emite campos vazios', () => {
    const ld = motoJsonLd({ brand: { name: 'Honda' }, model: 'Biz', status: 'AVAILABLE' }, {}, 'u');
    expect(JSON.stringify(ld)).not.toMatch(/null|undefined|""/);
  });

  it('loja como AutoDealer com endereço, telefone e horários abertos', () => {
    const ld = dealerJsonLd(loja, 'https://loja.test/');
    expect(ld.telephone).toBe('+554935655098');
    expect(ld.address).toMatchObject({
      addressLocality: 'Videira',
      addressRegion: 'SC',
      addressCountry: 'BR',
    });
    expect(ld.openingHoursSpecification).toEqual([
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: 'https://schema.org/Monday',
        opens: '08:00',
        closes: '18:00',
      },
    ]);
  });

  it('trilha de navegação numerada', () => {
    const ld = breadcrumbJsonLd([
      { name: 'Home', url: 'https://l/' },
      { name: 'Estoque', url: 'https://l/estoque' },
    ]);
    expect(ld.itemListElement[1]).toEqual({
      '@type': 'ListItem',
      position: 2,
      name: 'Estoque',
      item: 'https://l/estoque',
    });
  });

  it('serialização não deixa texto fechar a tag <script>', () => {
    const texto = serializeJsonLd({ description: 'ótima</script><script>alert(1)</script>' });
    expect(texto).not.toContain('</script>');
    expect(JSON.parse(texto).description).toBe('ótima</script><script>alert(1)</script>');
  });
});

describe('câmbio na descrição', () => {
  it('palavra em minúscula, sigla preservada', () => {
    expect(motoSeo({ ...moto, transmission: 'MANUAL' }, loja).description).toContain(
      'câmbio manual',
    );
    expect(motoSeo({ ...moto, transmission: 'CVT' }, loja).description).toContain('câmbio CVT');
    expect(motoSeo({ ...moto, transmission: 'DCT' }, loja).description).toContain('câmbio DCT');
  });
});
