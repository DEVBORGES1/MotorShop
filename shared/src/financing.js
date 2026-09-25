import { z } from 'zod';

import { LEAD_LIMITS } from './enums.js';

/**
 * Financiamento — tabela Price, fonte única para o site e para o servidor.
 *
 * Sem biblioteca: são poucas linhas, e cálculo próprio é auditável. O site
 * simula; o servidor refaz a mesma conta ao receber o lead, com a taxa que
 * ELE tem configurada — a parcela que chega à loja nunca é a digitada pelo
 * cliente.
 *
 * Dinheiro em reais na entrada e na saída; por dentro, centavos inteiros,
 * para o arredondamento ser um só e previsível.
 */

/**
 * Aviso obrigatório em toda superfície de simulação (risco R-07). Simulação
 * apresentada como proposta vira problema jurídico para a loja.
 */
export const FINANCING_DISCLAIMER =
  'Simulação com valores aproximados. Não constitui proposta de crédito; sujeita a análise da instituição financeira.';

/** Prazos que o painel oferece para a loja marcar. */
export const FINANCING_INSTALLMENT_CHOICES = Object.freeze([6, 12, 18, 24, 30, 36, 42, 48, 60, 72]);

export const FINANCING_LIMITS = Object.freeze({
  /** % ao mês. Acima disso é quase certamente erro de digitação (19 em vez de 1,9). */
  MAX_MONTHLY_RATE: 10,
  MAX_MIN_DOWN_PAYMENT_PERCENT: 90,
});

const toCents = (reais) => Math.round(reais * 100);
const toReais = (cents) => cents / 100;
const isNumber = (value) => typeof value === 'number' && Number.isFinite(value);

/**
 * Parcela fixa pela tabela Price.
 *
 * `PMT = PV · i / (1 − (1 + i)^−n)`; com taxa zero a fórmula divide por zero,
 * e a parcela é simplesmente `PV / n`.
 *
 * O total é a parcela **já arredondada** vezes o número de parcelas — é o
 * que o cliente efetivamente paga.
 *
 * @param {{ vehiclePrice: number, downPayment: number, installments: number, monthlyRate: number }} input
 *   valores em reais; `monthlyRate` em % ao mês (1.79 = 1,79% a.m.)
 * @returns {{ valid: true, financed: number, installmentValue: number, total: number, interest: number }
 *   | { valid: false, error: string }}
 */
export function simulateFinancing({ vehiclePrice, downPayment, installments, monthlyRate }) {
  if (!isNumber(vehiclePrice) || vehiclePrice <= 0) {
    return { valid: false, error: 'Informe o valor da moto' };
  }
  if (!isNumber(downPayment) || downPayment < 0) {
    return { valid: false, error: 'Informe o valor da entrada' };
  }
  if (downPayment >= vehiclePrice) {
    return { valid: false, error: 'A entrada precisa ser menor que o valor da moto' };
  }
  if (!Number.isInteger(installments) || installments < 1) {
    return { valid: false, error: 'Escolha o número de parcelas' };
  }
  if (!isNumber(monthlyRate) || monthlyRate < 0) {
    return { valid: false, error: 'Taxa de juros não configurada' };
  }

  const financedCents = toCents(vehiclePrice) - toCents(downPayment);
  const rate = monthlyRate / 100;

  const installmentCents =
    rate === 0
      ? Math.round(financedCents / installments)
      : Math.round((financedCents * rate) / (1 - (1 + rate) ** -installments));

  const totalCents = installmentCents * installments;

  return {
    valid: true,
    financed: toReais(financedCents),
    installmentValue: toReais(installmentCents),
    total: toReais(totalCents),
    interest: toReais(totalCents - financedCents),
  };
}

/** Entrada mínima em reais, arredondada para cima ao centavo. */
export function minimumDownPayment(vehiclePrice, minDownPaymentPercent = 0) {
  return toReais(Math.ceil((toCents(vehiclePrice) * minDownPaymentPercent) / 100));
}

/** A loja configurou o suficiente para simular? Sem taxa ou sem prazos, não. */
export function isFinancingConfigured(financing) {
  return isNumber(financing?.monthlyRate) && financing.installmentOptions?.length > 0;
}

/**
 * Confere uma simulação contra as regras da loja: prazo entre os oferecidos
 * e entrada mínima. Usado no simulador e, com a mesma regra, no servidor.
 *
 * @returns {string|null} mensagem de erro, ou `null` quando está dentro das regras
 */
export function checkFinancingRules({ vehiclePrice, downPayment, installments }, financing) {
  if (!isFinancingConfigured(financing)) return 'Simulação indisponível no momento';

  if (!financing.installmentOptions.includes(installments)) {
    return 'Prazo não disponível';
  }

  const minimo = minimumDownPayment(vehiclePrice, financing.minDownPaymentPercent ?? 0);
  if (downPayment < minimo) {
    return `A entrada mínima é de ${financing.minDownPaymentPercent}% do valor`;
  }

  return null;
}

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
