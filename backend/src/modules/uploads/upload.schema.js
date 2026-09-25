import { z } from 'zod';

export const signatureSchema = z
  .object({ motoId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Identificador inválido') })
  .strict();
