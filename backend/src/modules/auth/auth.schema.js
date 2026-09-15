import { z } from 'zod';

/**
 * O login NÃO reaplica a política de senha forte: fazê-lo revelaria a regra a
 * quem tenta adivinhar e recusaria senhas antigas ainda válidas. Aqui só se
 * verifica que os campos existem.
 */
export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email('E-mail inválido').max(160),
    password: z.string().min(1, 'Senha é obrigatória').max(200),
  })
  .strict();
