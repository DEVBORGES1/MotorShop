import { z } from 'zod';

import { LEAD_LIMITS } from '../enums.js';
import { FINANCING_INSTALLMENT_CHOICES, FINANCING_LIMITS } from '../financing.js';

/*
 * Em arquivo separado de `financing.js` de propósito: o cálculo é usado pelo
 * site público, e este schema (que importa o zod) só pelo painel e pelo
 * servidor. Juntos, a página da moto carregava o zod sem validar nada.
 */

/** Parâmetros de financiamento da loja (decisão F), editados nas Configurações. */
export const financingSettingsSchema = z
  .object({
    monthlyRate: z
      .number({ error: 'Informe a taxa' })
      .min(0, 'A taxa não pode ser negativa')
      .max(
        FINANCING_LIMITS.MAX_MONTHLY_RATE,
        `Taxa acima de ${FINANCING_LIMITS.MAX_MONTHLY_RATE}% a.m.`,
      )
      .nullable(),
    installmentOptions: z
      .array(z.number().int().min(LEAD_LIMITS.MIN_INSTALLMENTS).max(LEAD_LIMITS.MAX_INSTALLMENTS))
      .max(FINANCING_INSTALLMENT_CHOICES.length)
      .refine((options) => new Set(options).size === options.length, 'Prazo repetido')
      .transform((options) => [...options].sort((a, b) => a - b)),
    minDownPaymentPercent: z.number().min(0).max(FINANCING_LIMITS.MAX_MIN_DOWN_PAYMENT_PERCENT),
  })
  .strict();
