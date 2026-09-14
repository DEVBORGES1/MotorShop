import { z } from 'zod';

/**
 * Schemas de validação de marca.
 *
 * `.strict()` nas escritas: chave desconhecida é **erro**, não é ignorada.
 * É o que impede *mass assignment* — enviar `{ name, slug: "forjado" }` e ter
 * o slug sobrescrito por fora da regra de negócio.
 */

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

export const createBrandSchema = z
  .object({
    name: z.string().trim().min(1, 'Nome é obrigatório').max(60),
    logo: imageSchema.nullish(),
    active: z.boolean().optional(),
  })
  .strict();

export const updateBrandSchema = createBrandSchema.partial().strict();

export const objectIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Identificador inválido'),
});
