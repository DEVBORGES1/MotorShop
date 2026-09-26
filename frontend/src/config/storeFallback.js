/**
 * Configuração usada enquanto a loja não respondeu — primeira pintura da
 * página, API fora do ar ou banco ainda não configurado.
 *
 * Os valores são deliberadamente genéricos e correspondem aos padrões que a
 * API devolve quando não há loja cadastrada (`store.service.js`). Nome,
 * telefone, endereço e cores reais **nunca** entram aqui: é exatamente o
 * hardcode que o produto revendável não pode ter.
 */
export const storeFallback = Object.freeze({
  name: 'MotorShop',
  slogan: null,
  logo: null,
  theme: { primary: null, secondary: null, accent: null },
  contact: { whatsapp: null, phone: null, email: null },
  address: {},
  social: {},
  businessHours: [],
  highlights: [],
  seo: {},
  features: { financingEnabled: true, sellMotoEnabled: true },
  financing: { monthlyRate: null, installmentOptions: [], minDownPaymentPercent: 0 },
  configured: false,
});
