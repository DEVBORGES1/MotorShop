/**
 * Enumerações do domínio — fonte única para backend e frontend.
 *
 * Duplicar estes valores entre cliente e servidor é uma das formas mais comuns
 * de bug em stack sem tipagem: o backend aceita `"FLEX"`, o frontend envia
 * `"Flex"`, e a falha só aparece em runtime. Aqui existem uma vez.
 *
 * Os rótulos em pt-BR moram junto do valor de propósito: a tradução para
 * exibição pertence ao domínio, não a um `switch` espalhado pela UI.
 */

export const MOTO_STATUS = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  RESERVED: 'RESERVED',
  SOLD: 'SOLD',
  INACTIVE: 'INACTIVE',
});

export const MOTO_STATUS_LABEL = Object.freeze({
  AVAILABLE: 'Disponível',
  RESERVED: 'Reservada',
  SOLD: 'Vendida',
  INACTIVE: 'Inativa',
});

/**
 * Status visíveis na listagem pública do catálogo.
 * `SOLD` fica fora da listagem, mas a página individual continua acessível
 * (ver PUBLIC_DETAIL_STATUSES) — decisão **A** de ARCHITECTURE §15.
 */
export const PUBLIC_LIST_STATUSES = Object.freeze([MOTO_STATUS.AVAILABLE, MOTO_STATUS.RESERVED]);

/** Status acessíveis por slug. `INACTIVE` nunca é público. */
export const PUBLIC_DETAIL_STATUSES = Object.freeze([
  MOTO_STATUS.AVAILABLE,
  MOTO_STATUS.RESERVED,
  MOTO_STATUS.SOLD,
]);

export const FUEL = Object.freeze({
  GASOLINE: 'GASOLINE',
  FLEX: 'FLEX',
  ELECTRIC: 'ELECTRIC',
});

export const FUEL_LABEL = Object.freeze({
  GASOLINE: 'Gasolina',
  FLEX: 'Flex',
  ELECTRIC: 'Elétrica',
});

export const TRANSMISSION = Object.freeze({
  MANUAL: 'MANUAL',
  AUTOMATIC: 'AUTOMATIC',
  CVT: 'CVT',
  DCT: 'DCT',
});

export const TRANSMISSION_LABEL = Object.freeze({
  MANUAL: 'Manual',
  AUTOMATIC: 'Automático',
  CVT: 'CVT',
  DCT: 'DCT (dupla embreagem)',
});

/**
 * Ordenações aceitas no catálogo.
 *
 * É uma **whitelist**: o valor recebido nunca vira campo de ordenação
 * diretamente. Sem isso, `?sort=` viraria superfície de injeção.
 */
export const MOTO_SORT = Object.freeze({
  RECENTES: 'recentes',
  PRECO_ASC: 'preco_asc',
  PRECO_DESC: 'preco_desc',
  ANO_DESC: 'ano_desc',
  ANO_ASC: 'ano_asc',
  KM_ASC: 'km_asc',
  KM_DESC: 'km_desc',
});

export const PAGINATION = Object.freeze({
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 12,
  /** Teto imposto pelo servidor; o cliente não pode pedir mais. */
  MAX_LIMIT: 48,
});

/** Limites do domínio, usados na validação e no formulário do admin. */
export const MOTO_LIMITS = Object.freeze({
  MIN_YEAR: 1950,
  MAX_ENGINE_CAPACITY: 3000,
  MIN_ENGINE_CAPACITY: 49,
  MAX_FEATURES: 40,
  MAX_IMAGES: 20,
  MAX_DESCRIPTION: 5000,
});

export const values = (enumObject) => Object.values(enumObject);
