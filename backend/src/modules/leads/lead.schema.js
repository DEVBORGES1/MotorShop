import { LEAD_LIMITS, LEAD_STATUS, LEAD_TYPE, PAGINATION, values } from '@motorshop/shared';
import { z } from 'zod';

/**
 * Validação das rotas administrativas de lead. A criação pública usa
 * `createLeadSchema`, do pacote compartilhado.
 */

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Identificador inválido');

export const leadIdParamSchema = z.object({ id: objectId }).strict();

/** Lista separada por vírgula (`?tipo=CONTACT,SELL_MOTO`) → array. */
const csvOf = (schema) =>
  z
    .string()
    .transform((value) =>
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    )
    .pipe(z.array(schema));

/**
 * Período em data-hora ISO com fuso. O painel manda o início e o fim do dia
 * **no fuso de quem consulta**: "hoje" calculado em UTC no servidor cortaria
 * os leads das 21h às 23h59 de Brasília para o dia seguinte.
 */
const isoDate = z.iso.datetime({ offset: true }).transform((value) => new Date(value));

export const listLeadsQuerySchema = z
  .object({
    tipo: csvOf(z.enum(values(LEAD_TYPE))).optional(),
    status: csvOf(z.enum(values(LEAD_STATUS))).optional(),
    de: isoDate.optional(),
    ate: isoDate.optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(PAGINATION.MAX_LIMIT).optional(),
  })
  .strict()
  .refine((query) => !query.de || !query.ate || query.de <= query.ate, {
    path: ['ate'],
    message: 'O fim do período precisa ser depois do início',
  });

export const updateLeadSchema = z
  .object({
    status: z.enum(values(LEAD_STATUS)).optional(),
    note: z.string().trim().min(1).max(LEAD_LIMITS.MAX_NOTE).optional(),
  })
  .strict()
  .refine((body) => body.status || body.note, 'Informe o novo status ou uma anotação');
