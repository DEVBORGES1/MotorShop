import { CONSENT_TEXT_VERSION, LEAD_TYPE, MOTO_STATUS, USER_ROLE } from '@motorshop/shared';

import { Brand } from '../../src/modules/brands/brand.model.js';
import { Lead } from '../../src/modules/leads/lead.model.js';
import { Moto } from '../../src/modules/motos/moto.model.js';
import { StoreSettings } from '../../src/modules/store/store.model.js';
import { criarUsuario } from '../helpers/auth.js';

/**
 * Fábricas de dados de teste: um documento válido com o mínimo de digitação,
 * e só o que importa ao caso passado por cima. Um campo obrigatório novo no
 * modelo muda aqui, não em cada teste.
 */

let sequencia = 0;
const proximo = () => {
  sequencia += 1;
  return sequencia;
};

export function criarMarca(overrides = {}) {
  const n = proximo();
  return Brand.create({ name: `Marca ${n}`, slug: `marca-${n}`, ...overrides });
}

/** Moto disponível e completa. Sem `brand`, cria uma marca. */
export async function criarMoto(overrides = {}) {
  const n = proximo();
  const brand = overrides.brand ?? (await criarMarca())._id;
  return Moto.create({
    model: `Modelo ${n}`,
    year: 2022,
    mileage: 10_000,
    price: 2_500_000,
    engineCapacity: 300,
    fuel: 'GASOLINE',
    transmission: 'MANUAL',
    color: 'Preta',
    status: MOTO_STATUS.AVAILABLE,
    slug: `moto-${n}-2022`,
    ...overrides,
    brand,
  });
}

/** Lead de contato, com consentimento registrado como o formulário faz. */
export function criarLead(overrides = {}) {
  const n = proximo();
  return Lead.create({
    type: LEAD_TYPE.CONTACT,
    name: `Pessoa ${n}`,
    phone: `+55499${String(n).padStart(8, '0')}`,
    message: 'Olá, quero saber mais.',
    consent: { accepted: true, at: new Date(), textVersion: CONSENT_TEXT_VERSION },
    ...overrides,
  });
}

export function criarLoja(overrides = {}) {
  return StoreSettings.create({ name: 'Loja Teste', ...overrides });
}

/** Usuário do painel; e-mail único por chamada. */
export function criarUsuarioDoPainel(overrides = {}) {
  const n = proximo();
  return criarUsuario({
    name: `Usuário ${n}`,
    email: `usuario-${n}@teste.com`,
    role: USER_ROLE.ADMIN,
    ...overrides,
  });
}
