import { CONSENT_TEXT_VERSION, LEAD_TYPE } from '@motorshop/shared';

/**
 * Monta o corpo de `POST /api/leads` a partir dos valores do formulário.
 *
 * Cada formulário tem campos planos (marca, ano, km ao lado de nome e
 * telefone); a API espera os específicos do tipo dentro de `data`. A separação
 * mora aqui, e não em cada formulário, para o formato do envio ter um lugar só.
 */

const CAMPOS_DE_VENDA = ['brand', 'model', 'year', 'mileage', 'expectedPrice', 'condition'];

const semVazios = (objeto) =>
  Object.fromEntries(
    Object.entries(objeto).filter(([, valor]) => valor !== undefined && valor !== ''),
  );

/**
 * @param {string} type LEAD_TYPE
 * @param {object} valores saída do formulário, já validada
 * @param {{ source: object, motoId?: string }} contexto
 */
export function montarLead(type, valores, { source, motoId } = {}) {
  const { name, phone, email, message, website } = valores;

  const lead = semVazios({
    type,
    name,
    phone,
    email,
    message,
    website,
    source,
    consent: { accepted: true, textVersion: CONSENT_TEXT_VERSION },
  });

  if (type === LEAD_TYPE.MOTO_INTEREST) lead.moto = motoId;

  if (type === LEAD_TYPE.SELL_MOTO) {
    lead.data = semVazios(Object.fromEntries(CAMPOS_DE_VENDA.map((c) => [c, valores[c]])));
  }

  return lead;
}

/**
 * Texto do consentimento. Mudou o texto, mude `CONSENT_TEXT_VERSION` no pacote
 * compartilhado: o lead registra a versão aceita, e ela precisa corresponder
 * ao que a pessoa leu.
 */
export const textoDoConsentimento = (nomeDaLoja) =>
  `Autorizo a ${nomeDaLoja} a usar os dados informados para responder a este contato, conforme a Política de Privacidade.`;
