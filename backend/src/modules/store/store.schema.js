import { z } from 'zod';

/**
 * Validação da configuração da loja.
 * Tudo opcional: a tela de configurações salva parcialmente.
 */

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use uma cor no formato #RRGGBB');
const optionalText = (max) => z.string().trim().max(max).nullish();

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
        mapsUrl: z.string().trim().url().nullish(),
      })
      .strict()
      .optional(),

    social: z
      .object({
        instagram: optionalText(120),
        facebook: optionalText(120),
        youtube: optionalText(120),
      })
      .strict()
      .optional(),

    businessHours: z
      .array(
        z
          .object({
            weekday: z.number().int().min(0).max(6),
            opensAt: z
              .string()
              .regex(/^\d{2}:\d{2}$/)
              .nullish(),
            closesAt: z
              .string()
              .regex(/^\d{2}:\d{2}$/)
              .nullish(),
            closed: z.boolean().optional(),
          })
          .strict(),
      )
      .max(7)
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
  })
  .strict();
