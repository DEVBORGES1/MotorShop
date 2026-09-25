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

export const USER_ROLE = Object.freeze({
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
});

export const USER_ROLE_LABEL = Object.freeze({
  ADMIN: 'Administrador',
  SUPER_ADMIN: 'Super administrador',
});

/** Senha administrativa: comprimento mínimo exigido no cadastro e no login. */
export const PASSWORD_MIN_LENGTH = 12;

// --- Leads --------------------------------------------------------------------

/**
 * Tipos de lead. Coleção única com discriminador (decisão D-05): a loja
 * trabalha numa lista só, "todos os contatos", ordenada por data.
 */
export const LEAD_TYPE = Object.freeze({
  MOTO_INTEREST: 'MOTO_INTEREST',
  SELL_MOTO: 'SELL_MOTO',
  CONTACT: 'CONTACT',
  FINANCING: 'FINANCING',
});

export const LEAD_TYPE_LABEL = Object.freeze({
  MOTO_INTEREST: 'Interesse em moto',
  SELL_MOTO: 'Quer vender a moto',
  CONTACT: 'Contato',
  FINANCING: 'Financiamento',
});

export const LEAD_STATUS = Object.freeze({
  NEW: 'NEW',
  IN_PROGRESS: 'IN_PROGRESS',
  WON: 'WON',
  LOST: 'LOST',
});

export const LEAD_STATUS_LABEL = Object.freeze({
  NEW: 'Novo',
  IN_PROGRESS: 'Em atendimento',
  WON: 'Convertido',
  LOST: 'Perdido',
});

/** Estado da moto que o cliente quer vender (formulário "Venda sua moto"). */
export const MOTO_CONDITION = Object.freeze({
  EXCELLENT: 'EXCELLENT',
  GOOD: 'GOOD',
  FAIR: 'FAIR',
  NEEDS_REPAIR: 'NEEDS_REPAIR',
});

export const MOTO_CONDITION_LABEL = Object.freeze({
  EXCELLENT: 'Ótimo — sem detalhes',
  GOOD: 'Bom — detalhes de uso',
  FAIR: 'Regular — precisa de cuidados',
  NEEDS_REPAIR: 'Precisa de reparo',
});

export const LEAD_LIMITS = Object.freeze({
  MAX_NAME: 80,
  MAX_MESSAGE: 2000,
  MAX_NOTE: 1000,
  MIN_INSTALLMENTS: 6,
  MAX_INSTALLMENTS: 72,
  /** Janela em que um envio igual é tratado como repetição (clique duplo, reenvio). */
  DUPLICATE_WINDOW_MS: 2 * 60 * 1000,
});

/**
 * Versão do texto de consentimento (LGPD). O lead grava a versão que a pessoa
 * aceitou; mudar o texto exige mudar a versão, senão o registro deixa de
 * provar o que foi aceito.
 */
export const CONSENT_TEXT_VERSION = '2026-09-v1';

export const values = (enumObject) => Object.values(enumObject);
