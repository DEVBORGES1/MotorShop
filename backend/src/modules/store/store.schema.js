import { financingSettingsSchema, STORE_HIGHLIGHTS, STORE_IMAGE, values } from '@motorshop/shared';
import { z } from 'zod';

import { attachImageSchema } from '../motos/moto.schema.js';

/**
 * Validação da configuração da loja.
 * Tudo opcional: a tela de configurações salva parcialmente.
 */

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use uma cor no formato #RRGGBB');
const optionalText = (max) => z.string().trim().max(max).nullish();

/**
 * Link que o site público usa como `href` (mapa, redes sociais). Só http(s):
 * `z.string().url()` sozinho aceitaria `javascript:alert(1)`, que viraria
 * script executado no clique de qualquer visitante.
 */
const httpUrl = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .url('Informe o endereço completo, começando com https://')
    .refine((value) => /^https?:\/\//i.test(value), 'Use um link http:// ou https://')
    .nullish();

/** "08:00" — hora de 00 a 23, minuto de 00 a 59. */
const horaMinuto = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use o formato HH:MM')
  .nullish();

const businessHourSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    opensAt: horaMinuto,
    closesAt: horaMinuto,
    closed: z.boolean().optional(),
  })
  .strict()
  .superRefine((dia, ctx) => {
    if (dia.closed) return;

    if (!dia.opensAt || !dia.closesAt) {
      ctx.addIssue({
        code: 'custom',
        path: ['opensAt'],
        message: 'Dia aberto precisa de horário de abertura e de fechamento',
      });
      return;
    }

    // "HH:MM" com zero à esquerda compara corretamente como texto.
    if (dia.closesAt <= dia.opensAt) {
      ctx.addIssue({
        code: 'custom',
        path: ['closesAt'],
        message: 'O fechamento precisa ser depois da abertura',
      });
    }
  });

/** Aceita "49999998888", "(49) 99999-8888" etc.; normaliza para só dígitos. */
const phone = z
  .string()
  .trim()
  .transform((value) => value.replace(/\D/g, ''))
  .refine(
    (value) => value === '' || (value.length >= 10 && value.length <= 13),
    'Telefone inválido',
  )
  .transform((value) => value || null)
  .nullish();

export const updateStoreSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    legalName: optionalText(140),
    slogan: optionalText(140),

    theme: z
      .object({
        primary: hexColor.optional(),
        secondary: hexColor.optional(),
        accent: hexColor.optional(),
      })
      .strict()
      .optional(),

    contact: z
      .object({
        whatsapp: phone,
        phone,
        email: z.string().trim().toLowerCase().email().nullish(),
      })
      .strict()
      .optional(),

    address: z
      .object({
        street: optionalText(140),
        number: optionalText(20),
        complement: optionalText(80),
        district: optionalText(80),
        city: optionalText(80),
        state: z.string().trim().length(2).toUpperCase().nullish(),
        zipCode: optionalText(9), // "89000-000"
        mapsUrl: httpUrl(500), // links completos do Google Maps passam de 300 caracteres
      })
      .strict()
      .optional(),

    highlights: z
      .array(
        z
          .object({
            title: z.string().trim().min(1, 'Informe o título').max(STORE_HIGHLIGHTS.MAX_TITLE),
            text: optionalText(STORE_HIGHLIGHTS.MAX_TEXT),
          })
          .strict(),
      )
      .max(STORE_HIGHLIGHTS.MAX, `No máximo ${STORE_HIGHLIGHTS.MAX} diferenciais`)
      .optional(),

    social: z
      .object({
        instagram: httpUrl(200),
        facebook: httpUrl(200),
        youtube: httpUrl(200),
      })
      .strict()
      .optional(),

    businessHours: z
      .array(businessHourSchema)
      .max(7)
      .refine(
        (dias) => new Set(dias.map((dia) => dia.weekday)).size === dias.length,
        'Cada dia da semana só pode aparecer uma vez',
      )
      .optional(),

    seo: z
      .object({
        defaultTitle: optionalText(70),
        defaultDescription: optionalText(180),
        siteUrl: z.string().trim().url().nullish(),
      })
      .strict()
      .optional(),

    features: z
      .object({
        financingEnabled: z.boolean().optional(),
        sellMotoEnabled: z.boolean().optional(),
      })
      .strict()
      .optional(),

    financing: financingSettingsSchema.optional(),
  })
  .strict();

/** `logo` ou `ogImage` (imagem de compartilhamento). */
export const storeImageParamSchema = z
  .object({ tipo: z.enum(values(STORE_IMAGE), { error: 'Use logo ou ogImage' }) })
  .strict();

/** Metadados do envio ao provedor — a mesma conferência das fotos das motos. */
export const storeImageSchema = attachImageSchema;
