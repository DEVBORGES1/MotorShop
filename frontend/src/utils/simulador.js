import { checkFinancingRules, minimumDownPayment, simulateFinancing } from '@motorshop/shared';

/**
 * Estado do simulador de financiamento, sem React.
 *
 * O cálculo em si é do pacote compartilhado (o mesmo que o servidor usa);
 * aqui fica o que é da tela: valores iniciais, a ordem das mensagens de erro e
 * a tabela com todos os prazos.
 */

/** Entrada inicial: o mínimo da loja — o ponto de partida mais honesto. */
export function entradaInicial(valor, financing) {
  return valor > 0 ? minimumDownPayment(valor, financing?.minDownPaymentPercent ?? 0) : 0;
}

/** Prazo inicial: o maior oferecido. */
export const parcelasIniciais = (financing) => financing?.installmentOptions?.at(-1) ?? null;

/** Passo do controle deslizante da entrada: R$ 100, ou R$ 10 em valores baixos. */
export const passoDaEntrada = (valor) => (valor > 2000 ? 100 : 10);

/**
 * Resultado da simulação para a tela.
 *
 * Erros de preenchimento (valor, entrada ≥ valor) vêm antes das regras da
 * loja: "entrada mínima de 20%" não ajuda quem ainda nem digitou o valor.
 *
 * @returns {{ erro: string } | { financed, installmentValue, total, interest }}
 */
export function resultadoDaSimulacao({ valor, entrada, parcelas }, financing) {
  const simulacao = simulateFinancing({
    vehiclePrice: valor,
    downPayment: entrada,
    installments: parcelas,
    monthlyRate: financing?.monthlyRate,
  });
  if (!simulacao.valid) return { erro: simulacao.error };

  const regra = checkFinancingRules(
    { vehiclePrice: valor, downPayment: entrada, installments: parcelas },
    financing,
  );
  if (regra) return { erro: regra };

  const { valid: _valid, ...resultado } = simulacao;
  return resultado;
}

/** Parcela em cada prazo oferecido, para comparar de relance. */
export function tabelaDePrazos({ valor, entrada }, financing) {
  return (financing?.installmentOptions ?? []).map((parcelas) => {
    const simulacao = simulateFinancing({
      vehiclePrice: valor,
      downPayment: entrada,
      installments: parcelas,
      monthlyRate: financing.monthlyRate,
    });
    return { parcelas, valor: simulacao.valid ? simulacao.installmentValue : null };
  });
}
