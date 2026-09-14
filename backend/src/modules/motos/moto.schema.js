import {
  FUEL,
  MOTO_LIMITS,
  MOTO_SORT,
  MOTO_STATUS,
  PAGINATION,
  TRANSMISSION,
  values,
} from '@motorshop/shared';
import { z } from 'zod';

import { toCents } from '../../utils/money.js';

/**
 * Schemas de validação de moto.
 *
 * Query: tudo chega como string e é **coagido** aqui (`"2024"` → `2024`).
 * Escrita: `.strict()` — chave desconhecida é erro, o que fecha *mass
 * assignment* (ex.: tentar enviar `slug` ou `status` por fora da regra).
 */

const MAX_YEAR = new Date().getFullYear() + 1;
const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Identificador inválido');

/** Lista separada por vírgula (`?marca=honda,yamaha`) → array. */
const csvOf = (schema) =>
  z
    .union([z.string(), z.array(z.string())])
    .transform((value) => (Array.isArray(value) ? value : value.split(',')))
    .transform((list) => list.map((item) => item.trim()).filter(Boolean))
    .pipe(z.array(schema));

/** Preço entra em REAIS na API e é convertido para centavos (D-04). */
const reaisToCents = z.coerce.number().positive().max(10_000_000).transform(toCents);

const booleanish = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');

// --- Query pública do catálogo ---------------------------------------------

const listMotosQueryBase = z
  .object({
    q: z.string().trim().min(2).max(80).optional(),
    marca: csvOf(z.string().min(1)).optional(),

    precoMin: reaisToCents.optional(),
    precoMax: reaisToCents.optional(),
    anoMin: z.coerce.number().int().min(MOTO_LIMITS.MIN_YEAR).max(MAX_YEAR).optional(),
    anoMax: z.coerce.number().int().min(MOTO_LIMITS.MIN_YEAR).max(MAX_YEAR).optional(),
    kmMin: z.coerce.number().int().min(0).optional(),
    kmMax: z.coerce.number().int().min(0).optional(),
    ccMin: z.coerce.number().int().min(0).optional(),
    ccMax: z.coerce.number().int().min(0).optional(),

    combustivel: csvOf(z.enum(values(FUEL))).optional(),
    cambio: csvOf(z.enum(values(TRANSMISSION))).optional(),
    destaque: booleanish.optional(),
    oferta: booleanish.optional(),

    sort: z.enum(values(MOTO_SORT)).default(MOTO_SORT.RECENTES),
    page: z.coerce.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(PAGINATION.MAX_LIMIT)
      .default(PAGINATION.DEFAULT_LIMIT),
  })
  .strict();

export const listMotosQuerySchema = listMotosQueryBase.superRefine(checkRanges);

/** Query administrativa: igual à pública, mais o filtro por status. */
export const listMotosAdminQuerySchema = listMotosQueryBase
  .extend({ status: csvOf(z.enum(values(MOTO_STATUS))).optional() })
  .superRefine(checkRanges);

/** Faixa invertida é erro de quem chama, não resultado vazio silencioso. */
function checkRanges(query, ctx) {
  const pairs = [
    ['precoMin', 'precoMax'],
    ['anoMin', 'anoMax'],
    ['kmMin', 'kmMax'],
    ['ccMin', 'ccMax'],
  ];

  for (const [min, max] of pairs) {
    if (query[min] !== undefined && query[max] !== undefined && query[min] > query[max]) {
      ctx.addIssue({
        code: 'custom',
        path: [min],
        message: `não pode ser maior que ${max}`,
      });
    }
  }
}

// --- Escrita ----------------------------------------------------------------

const imageSchema = z
  .object({
    id: z.string().min(1),
    publicId: z.string().min(1),
    url: z.string().url(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    alt: z.string().max(200).optional(),
    order: z.number().int().min(0).optional(),
  })
  .strict();

const motoWriteBase = z
  .object({
    brand: objectId,
    model: z.string().trim().min(1).max(80),
    version: z.string().trim().max(80).nullish(),

    year: z.number().int().min(MOTO_LIMITS.MIN_YEAR).max(MAX_YEAR),
    mileage: z.number().int().min(0),
    price: reaisToCents,
    previousPrice: reaisToCents.nullish(),

    engineCapacity: z
      .number()
      .int()
      .min(MOTO_LIMITS.MIN_ENGINE_CAPACITY)
      .max(MOTO_LIMITS.MAX_ENGINE_CAPACITY),
    fuel: z.enum(values(FUEL)),
    transmission: z.enum(values(TRANSMISSION)),
    color: z.string().trim().min(1).max(40),

    licensePlate: z.string().trim().max(10).nullish(),
    description: z.string().trim().max(MOTO_LIMITS.MAX_DESCRIPTION).nullish(),
    features: z.array(z.string().trim().min(1).max(80)).max(MOTO_LIMITS.MAX_FEATURES).optional(),

    images: z.array(imageSchema).max(MOTO_LIMITS.MAX_IMAGES).optional(),
    mainImageId: z.string().nullish(),

    featured: z.boolean().optional(),
    onSale: z.boolean().optional(),
    status: z.enum(values(MOTO_STATUS)).optional(),
  })
  .strict();

export const createMotoSchema = motoWriteBase.superRefine(checkOffer);

// Deriva da MESMA base, em vez de de `createMotoSchema`: assim o refinamento é
// aplicado uma vez em cada schema final, sem depender de ele propagar por
// `.partial()`.
export const updateMotoSchema = motoWriteBase.partial().superRefine(checkOffer);

/** Oferta sem preço anterior não comunica desconto nenhum. */
function checkOffer(data, ctx) {
  if (data.onSale === true && data.previousPrice == null) {
    ctx.addIssue({
      code: 'custom',
      path: ['previousPrice'],
      message: 'é obrigatório quando a moto está em oferta',
    });
  }

  if (data.previousPrice != null && data.price != null && data.previousPrice <= data.price) {
    ctx.addIssue({
      code: 'custom',
      path: ['previousPrice'],
      message: 'deve ser maior que o preço atual',
    });
  }
}

export const changeStatusSchema = z.object({ status: z.enum(values(MOTO_STATUS)) }).strict();

export const slugParamSchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'Slug inválido')
    .max(140),
});

export const idParamSchema = z.object({ id: objectId });
