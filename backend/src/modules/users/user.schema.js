import { PASSWORD_MIN_LENGTH, USER_ROLE, values } from '@motorshop/shared';
import { z } from 'zod';

/**
 * Senhas obviamente fracas, recusadas independentemente do comprimento.
 * Não substitui uma política completa — evita o pior caso óbvio.
 */
const WEAK = ['senha', 'password', '123456', 'qwerty', 'admin', 'motorshop'];

const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `A senha deve ter no mínimo ${PASSWORD_MIN_LENGTH} caracteres`)
  .max(200)
  .refine(
    (value) => !WEAK.some((weak) => value.toLowerCase().includes(weak)),
    'A senha é previsível demais. Escolha outra.',
  );

const emailSchema = z.string().trim().toLowerCase().email('E-mail inválido').max(160);

export const createUserSchema = z
  .object({
    name: z.string().trim().min(1, 'Nome é obrigatório').max(80),
    email: emailSchema,
    password: passwordSchema,
    role: z.enum(values(USER_ROLE)).optional(),
  })
  .strict();

/**
 * `password` é opcional na atualização; quando vem, passa pela mesma regra.
 * `active` permite desativar — nunca há exclusão física de usuário.
 */
export const updateUserSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    email: emailSchema.optional(),
    password: passwordSchema.optional(),
    role: z.enum(values(USER_ROLE)).optional(),
    active: z.boolean().optional(),
  })
  .strict();

export const userIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Identificador inválido'),
});
