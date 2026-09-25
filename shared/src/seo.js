import { FUEL_LABEL, MOTO_STATUS, TRANSMISSION_LABEL } from './enums.js';

/**
 * Metadados de SEO — fonte única para o servidor e para o navegador.
 *
 * O servidor usa isto para injetar título, descrição, Open Graph e JSON-LD no
 * HTML inicial (é o que o WhatsApp e o Facebook leem, sem executar JS); o
 * navegador usa o mesmo para manter a página coerente após navegar pelo SPA.
 * Com duas implementações, o título do preview e o da aba acabariam diferentes.
 *
 * Nenhum texto de loja aqui: nome, cidade e descrições vêm da configuração.
 */

export const SEO_LIMITS = Object.freeze({ TITLE: 70, DESCRIPTION: 160 });

const NUMERO = new Intl.NumberFormat('pt-BR');
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Corta no limite sem partir palavra, com reticências. */
export function truncate(text, max) {
  const clean = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:–—-]+$/, '')}…`;
}

/**
 * Rótulo no meio da frase: "Manual" → "manual", mas sigla continua sigla
 * ("CVT", "DCT (dupla embreagem)").
 */
const inlineLabel = (label) => label.replace(/^(\p{Lu})(?=\p{Ll})/u, (c) => c.toLowerCase());

const joinTitle = (...parts) => parts.filter(Boolean).join(' | ');
const motoName = (moto) =>
  [moto?.brand?.name, moto?.model, moto?.version].filter(Boolean).join(' ');
const cityOf = (store) => [store?.address?.city, store?.address?.state].filter(Boolean).join(' - ');

// --- Páginas ------------------------------------------------------------------

/**
 * Metadados de uma página estática.
 *
 * @param {'home'|'estoque'|'financiamento'|'venda-sua-moto'|'sobre'|'contato'|'privacidade'|'admin'|'not-found'} page
 * @returns {{ title: string, description: string, robots?: string, ogType: string }}
 */
export function pageSeo(page, store = {}) {
  const name = store.name || 'Loja';
  const city = cityOf(store);
  const where = city ? ` em ${city}` : '';
  const base = store.seo?.defaultDescription || store.slogan;

  const pages = {
    home: {
      title: store.seo?.defaultTitle || joinTitle(name, store.slogan || `Motos${where}`),
      description:
        base || `Motos seminovas e usadas${where}. Veja o estoque da ${name} e fale com a loja.`,
    },
    estoque: {
      title: joinTitle('Estoque de motos', name),
      description: `Motos disponíveis na ${name}${where}. Filtre por marca, preço, ano e quilometragem.`,
    },
    financiamento: {
      title: joinTitle('Financiamento de motos', name),
      description: `Simule as parcelas do financiamento da sua moto na ${name}. Simulação sem compromisso.`,
    },
    'venda-sua-moto': {
      title: joinTitle('Venda sua moto', name),
      description: `Conte sobre a sua moto e receba uma proposta da ${name} — para vender ou abater na próxima.`,
    },
    sobre: {
      title: joinTitle(`Sobre a ${name}`),
      description: base || `Conheça a ${name}${where}: endereço, horários e contato.`,
    },
    contato: {
      title: joinTitle('Contato', name),
      description: `Fale com a ${name}${where}: WhatsApp, telefone, endereço e horários.`,
    },
    privacidade: {
      title: joinTitle('Política de privacidade', name),
      description: `Como a ${name} trata os dados enviados pelos formulários do site.`,
    },
    admin: { title: joinTitle('Painel', name), description: '', robots: 'noindex, nofollow' },
    'not-found': {
      title: joinTitle('Página não encontrada', name),
      description: '',
      robots: 'noindex, follow',
    },
  };

  const meta = pages[page] ?? pages['not-found'];
  return {
    ogType: 'website',
    ...meta,
    title: truncate(meta.title, SEO_LIMITS.TITLE),
    description: truncate(meta.description, SEO_LIMITS.DESCRIPTION),
  };
}

/**
 * Metadados da página de uma moto. O título é o que aparece no preview do
 * WhatsApp: modelo, ano e km primeiro, loja no fim.
 */
export function motoSeo(moto, store = {}) {
  const name = motoName(moto);
  const sold = moto.status === MOTO_STATUS.SOLD;
  const km = moto.mileage != null ? `${NUMERO.format(moto.mileage)} km` : null;

  const specs = [
    moto.year,
    km,
    moto.engineCapacity ? `${NUMERO.format(moto.engineCapacity)} cc` : null,
    FUEL_LABEL[moto.fuel],
    TRANSMISSION_LABEL[moto.transmission]
      ? `câmbio ${inlineLabel(TRANSMISSION_LABEL[moto.transmission])}`
      : null,
    moto.color,
  ].filter(Boolean);

  const price = sold ? 'Vendida' : moto.price ? BRL.format(moto.price) : null;
  const city = cityOf(store);

  return {
    title: truncate(
      joinTitle([name, moto.year, km && `— ${km}`].filter(Boolean).join(' '), store.name),
      SEO_LIMITS.TITLE,
    ),
    description: truncate(
      [`${name}: ${specs.join(', ')}.`, price && `${price}.`, city && `${store.name} em ${city}.`]
        .filter(Boolean)
        .join(' '),
      SEO_LIMITS.DESCRIPTION,
    ),
    ogType: 'product',
  };
}

// --- Imagem de compartilhamento ----------------------------------------------------

const DELIVERY_MARK = '/image/upload/';

/**
 * Imagem de preview (1200×630, JPG). JPG e não AVIF/WebP: é o formato que
 * todo aplicativo de mensagem mostra. Só reescreve URLs do provedor de
 * imagens; qualquer outra volta como veio.
 */
export function shareImageUrl(url) {
  if (!url) return null;
  if (!url.includes(DELIVERY_MARK)) return url;
  const [before, after] = url.split(DELIVERY_MARK);
  return `${before}${DELIVERY_MARK}c_fill,g_auto,w_1200,h_630,f_jpg,q_auto/${after}`;
}

/** Foto principal da moto (a capa escolhida no painel), ou a primeira da ordem. */
export function coverImage(moto) {
  const images = moto?.images ?? [];
  return (
    images.find((image) => image.id === moto.mainImageId) ??
    [...images].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0] ??
    null
  );
}

// --- Dados estruturados (JSON-LD) ------------------------------------------------

const AVAILABILITY = {
  [MOTO_STATUS.AVAILABLE]: 'https://schema.org/InStock',
  [MOTO_STATUS.RESERVED]: 'https://schema.org/LimitedAvailability',
  [MOTO_STATUS.SOLD]: 'https://schema.org/SoldOut',
};

export const availabilityFor = (status) => AVAILABILITY[status] ?? null;

const withoutEmpty = (object) =>
  Object.fromEntries(
    Object.entries(object).filter(
      ([, value]) => value != null && value !== '' && !(Array.isArray(value) && !value.length),
    ),
  );

/**
 * Moto como `Product` + `Motorcycle` (subtipo de `Vehicle`), com `Offer`.
 * Moto vendida (decisão A) segue listada, com `SoldOut` e sem preço — a API
 * pública não o envia.
 */
export function motoJsonLd(moto, store, url) {
  const images = [...(moto.images ?? [])]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((image) => image.url);
  const cover = coverImage(moto)?.url;

  return withoutEmpty({
    '@context': 'https://schema.org',
    '@type': ['Product', 'Motorcycle'],
    name: [motoName(moto), moto.year].filter(Boolean).join(' '),
    url,
    image: cover ? [cover, ...images.filter((image) => image !== cover)] : images,
    description: moto.description || undefined,
    brand: moto.brand?.name ? { '@type': 'Brand', name: moto.brand.name } : undefined,
    model: moto.model,
    vehicleModelDate: moto.year ? String(moto.year) : undefined,
    color: moto.color,
    fuelType: FUEL_LABEL[moto.fuel],
    vehicleTransmission: TRANSMISSION_LABEL[moto.transmission],
    mileageFromOdometer:
      moto.mileage != null
        ? { '@type': 'QuantitativeValue', value: moto.mileage, unitCode: 'KMT' }
        : undefined,
    vehicleEngine: moto.engineCapacity
      ? {
          '@type': 'EngineSpecification',
          engineDisplacement: {
            '@type': 'QuantitativeValue',
            value: moto.engineCapacity,
            unitCode: 'CMQ',
          },
        }
      : undefined,
    offers: withoutEmpty({
      '@type': 'Offer',
      url,
      priceCurrency: 'BRL',
      price: moto.price ?? undefined,
      availability: availabilityFor(moto.status),
      itemCondition: 'https://schema.org/UsedCondition',
      seller: store?.name ? { '@type': 'AutoDealer', name: store.name } : undefined,
    }),
  });
}

const DAYS = [
  'https://schema.org/Sunday',
  'https://schema.org/Monday',
  'https://schema.org/Tuesday',
  'https://schema.org/Wednesday',
  'https://schema.org/Thursday',
  'https://schema.org/Friday',
  'https://schema.org/Saturday',
];

/** A loja como `AutoDealer`: endereço, telefone e horários — resultado rico local. */
export function dealerJsonLd(store, url) {
  const address = store.address ?? {};
  const street = [address.street, address.number, address.complement].filter(Boolean).join(', ');
  const phone = store.contact?.phone || store.contact?.whatsapp;

  return withoutEmpty({
    '@context': 'https://schema.org',
    '@type': 'AutoDealer',
    name: store.name,
    url,
    description: store.seo?.defaultDescription || store.slogan || undefined,
    logo: store.logo?.url,
    image: store.ogImage?.url || store.logo?.url,
    telephone: phone
      ? `+55${String(phone)
          .replace(/\D/g, '')
          .replace(/^55(?=\d{10,11}$)/, '')}`
      : undefined,
    email: store.contact?.email,
    address:
      street || address.city
        ? withoutEmpty({
            '@type': 'PostalAddress',
            streetAddress: street,
            addressLocality: address.city,
            addressRegion: address.state,
            postalCode: address.zipCode,
            addressCountry: 'BR',
          })
        : undefined,
    openingHoursSpecification: (store.businessHours ?? [])
      .filter((day) => !day.closed && day.opensAt && day.closesAt)
      .map((day) => ({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: DAYS[day.weekday],
        opens: day.opensAt,
        closes: day.closesAt,
      })),
    sameAs: Object.values(store.social ?? {}).filter(Boolean),
  });
}

/** Trilha de navegação. `items`: [{ name, url }], da raiz até a página atual. */
export function breadcrumbJsonLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * JSON-LD pronto para ficar dentro de `<script>`. `</script>` dentro de um
 * texto (descrição da moto, por exemplo) fecharia a tag e o resto viraria
 * HTML executável — `<` vira `<`, que o JSON lê igual.
 */
export function serializeJsonLd(data) {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/** URL absoluta a partir da base do site (sem barra dupla). */
export const absoluteUrl = (base, path) => `${String(base).replace(/\/+$/, '')}${path}`;
