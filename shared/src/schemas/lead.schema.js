import { z } from 'zod';

import {
  CONSENT_TEXT_VERSION,
  LEAD_LIMITS,
  LEAD_TYPE,
  MOTO_CONDITION,
  MOTO_LIMITS,
  values,
} from '../enums.js';

/**
 * Validação de lead — fonte única para o servidor e para os formulários.
 *
 * A mesma regra roda nos dois lados: o formulário avisa antes de enviar e o
 * servidor recusa o que passar por fora dele. Com o schema duplicado, o dia em
 * que um lado mudasse sem o outro seria o dia em que o formulário aceitaria um
 * envio que a API recusa — e o lead se perderia sem ninguém ver.
 *
 * `type` é o discriminador (ARCHITECTURE §5.3): cada tipo tem seu próprio
 * bloco `data`, e `data` incompatível com o tipo é erro, não campo ignorado.
 */

const MAX_YEAR = new Date().getFullYear() + 1;
const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Identificador inválido');

/** Campo de texto opcional: string vazia do formulário conta como ausente. */
const semVazio = (schema) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    schema,
  );

/**
 * Telefone brasileiro em E.164 (`+5549999998888`), ou `null` se inválido.
 *
 * Aceita o que as pessoas digitam: "(49) 99999-8888", "49 3565-5098",
 * "+55 49 9 9999-8888". Exige DDD — sem ele a loja não consegue retornar.
 */
export function normalizePhoneBR(value) {
  let digits = String(value ?? '').replace(/\D/g, '');

  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    digits = digits.slice(2);
  }
  if (digits.length !== 10 && digits.length !== 11) return null;

  // DDD de 11 a 99; celular (11 dígitos) começa com 9 depois do DDD.
  if (digits[0] === '0' || digits[1] === '0') return null;
  if (digits.length === 11 && digits[2] !== '9') return null;

  return `+55${digits}`;
}

export const leadPhoneSchema = z
  .string({ error: 'Informe seu telefone' })
  .trim()
  .transform((value, ctx) => {
    const phone = normalizePhoneBR(value);
    if (!phone) {
      ctx.addIssue({ code: 'custom', message: 'Telefone inválido — informe com DDD' });
      return z.NEVER;
    }
    return phone;
  });

/** Campos de contato comuns a todo lead. Exportados para os formulários. */
export const leadContactFields = {
  name: z
    .string({ error: 'Informe seu nome' })
    .trim()
    .min(2, 'Informe seu nome')
    .max(LEAD_LIMITS.MAX_NAME),
  phone: leadPhoneSchema,
  email: semVazio(z.string().trim().toLowerCase().max(120).email('E-mail inválido').optional()),
  message: semVazio(z.string().trim().max(LEAD_LIMITS.MAX_MESSAGE).optional()),
};

/** De onde o lead veio. Tudo opcional: bloqueador de rastreio não pode impedir o envio. */
const sourceSchema = z
  .object({
    page: z.string().trim().max(300).startsWith('/').optional(),
    referrer: z.string().trim().max(500).optional(),
    utm: z
      .object({
        source: z.string().trim().max(100).optional(),
        medium: z.string().trim().max(100).optional(),
        campaign: z.string().trim().max(100).optional(),
        term: z.string().trim().max(100).optional(),
        content: z.string().trim().max(100).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

/**
 * Consentimento (LGPD). A versão enviada precisa ser a atual: um formulário
 * aberto antes de o texto mudar não registra aceite de um texto que a pessoa
 * não leu. A data é carimbada pelo servidor, nunca aceita do cliente.
 */
export const consentSchema = z
  .object({
    accepted: z.literal(true, { error: 'É preciso autorizar o uso dos dados para enviar' }),
    textVersion: z.literal(CONSENT_TEXT_VERSION, {
      error: 'O texto de consentimento mudou. Recarregue a página e envie de novo.',
    }),
  })
  .strict();

/**
 * Campos que acompanham qualquer tipo. `website` é o honeypot: invisível para
 * pessoas, preenchido por robôs. O servidor aceita o campo para poder
 * descartar o envio em silêncio — recusar com erro ensinaria o robô.
 */
const envelope = {
  source: sourceSchema.optional(),
  consent: consentSchema,
  website: z.string().max(200).optional(),
};

export const sellMotoDataSchema = z
  .object({
    brand: z.string({ error: 'Informe a marca' }).trim().min(1, 'Informe a marca').max(60),
    model: z.string({ error: 'Informe o modelo' }).trim().min(1, 'Informe o modelo').max(80),
    year: z
      .number({ error: 'Informe o ano' })
      .int('Ano inválido')
      .min(MOTO_LIMITS.MIN_YEAR, 'Ano inválido')
      .max(MAX_YEAR, 'Ano inválido'),
    mileage: z
      .number({ error: 'Informe a quilometragem' })
      .int('Use só números')
      .min(0, 'Quilometragem inválida')
      .max(1_000_000, 'Quilometragem inválida'),
    // Em reais, como todo preço na API (decisão D-04).
    expectedPrice: z
      .number()
      .positive('Informe um valor maior que zero')
      .max(10_000_000)
      .optional(),
    condition: z.enum(values(MOTO_CONDITION)).optional(),
  })
  .strict();

export const financingDataSchema = z
  .object({
    vehiclePrice: z.number().positive().max(10_000_000),
    downPayment: z.number().min(0).max(10_000_000),
    installments: z
      .number()
      .int()
      .min(LEAD_LIMITS.MIN_INSTALLMENTS)
      .max(LEAD_LIMITS.MAX_INSTALLMENTS),
  })
  .strict()
  .refine((data) => data.downPayment < data.vehiclePrice, {
    path: ['downPayment'],
    message: 'A entrada precisa ser menor que o valor da moto',
  });

export const createLeadSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal(LEAD_TYPE.MOTO_INTEREST),
      ...leadContactFields,
      ...envelope,
      moto: objectId,
    })
    .strict(),
  z
    .object({
      type: z.literal(LEAD_TYPE.SELL_MOTO),
      ...leadContactFields,
      ...envelope,
      data: sellMotoDataSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal(LEAD_TYPE.CONTACT),
      ...leadContactFields,
      // Contato sem mensagem não diz à loja o que responder.
      message: z
        .string({ error: 'Escreva sua mensagem' })
        .trim()
        .min(5, 'Escreva sua mensagem')
        .max(LEAD_LIMITS.MAX_MESSAGE),
      ...envelope,
    })
    .strict(),
  z
    .object({
      type: z.literal(LEAD_TYPE.FINANCING),
      ...leadContactFields,
      ...envelope,
      moto: objectId.optional(),
      data: financingDataSchema,
    })
    .strict(),
]);
