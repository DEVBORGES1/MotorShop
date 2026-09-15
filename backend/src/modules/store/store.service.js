import { ApiError } from '../../utils/ApiError.js';
import * as repository from './store.repository.js';
import { serializeStore } from './store.serializer.js';

/**
 * Valores usados enquanto a loja ainda não foi configurada. Garantem que o
 * site público nunca quebre por falta de configuração — mas são propositalmente
 * genéricos, para que ninguém os confunda com dados reais de uma loja.
 */
const DEFAULTS = Object.freeze({
  name: 'MotorShop',
  slogan: null,
  logo: null,
  theme: { primary: '#4CD62B', secondary: '#0A0B0A', accent: '#38C172' },
  contact: { whatsapp: null, phone: null, email: null },
  address: {},
  social: {},
  businessHours: [],
  seo: {},
  features: { financingEnabled: true, sellMotoEnabled: true },
  configured: false,
});

export async function getPublic() {
  const store = await repository.findPublic();
  if (!store) return DEFAULTS;

  return { ...serializeStore(store), configured: true };
}

export async function getFull() {
  const store = await repository.findFull();
  if (!store) throw ApiError.notFound('A loja ainda não foi configurada');
  return serializeStore(store);
}

export async function update(data) {
  return serializeStore(await repository.upsert(data));
}
