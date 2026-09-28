import {
  checkFinancingRules,
  isFinancingConfigured,
  minimumDownPayment,
  MOTO_STATUS,
  simulateFinancing,
} from '@motorshop/shared';

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

const emCentavos = (reais) => Math.round(reais * 100) / 100;

/** Entrada total: dinheiro mais a moto na troca, sem sobra de ponto flutuante. */
export const entradaTotal = (dinheiro, troca = 0) => emCentavos(dinheiro + troca);

/**
 * Quanto do mínimo ainda precisa ser em dinheiro quando a moto na troca já
 * cobre uma parte (ou todo) dele.
 */
export const minimoEmDinheiro = (minimoTotal, troca = 0) =>
  Math.max(0, emCentavos(minimoTotal - troca));

/** Entrada em % do valor da moto, com uma casa (19,6%). Sem valor, `null`. */
export function percentualDaEntrada(entrada, valor) {
  if (!(valor > 0)) return null;
  return Math.round((entrada / valor) * 1000) / 10;
}

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

/**
 * Motos que dá para escolher no simulador: disponíveis e com preço — a
 * reservada já tem comprador. Em ordem alfabética, para achar pelo nome; o
 * padrão é a primeira da lista recebida (a mais recente, na ordem da API).
 *
 * @param {Array<object> | null | undefined} lista
 * @returns {{ opcoes: object[], padrao: object | null }}
 */
export function motosParaSimular(lista) {
  const disponiveis = (lista ?? []).filter(
    (moto) => moto?.status === MOTO_STATUS.AVAILABLE && moto.price > 0,
  );
  const rotulo = (moto) => `${moto.brand?.name ?? ''} ${moto.model} ${moto.year ?? ''}`;
  const opcoes = [...disponiveis].sort((a, b) => rotulo(a).localeCompare(rotulo(b), 'pt-BR'));

  return { opcoes, padrao: disponiveis[0] ?? null };
}

/**
 * Parcela estimada para o card da moto: maior prazo oferecido, entrada mínima
 * da loja. É o mesmo ponto de partida do simulador da página da moto, então
 * o número do card e o do simulador coincidem.
 *
 * @returns {{ parcelas: number, valor: number } | null} `null` quando a loja
 *   não simula ou a moto não tem preço — o card simplesmente não mostra a linha.
 */
export function parcelaEstimada(preco, features, financing) {
  if (!features?.financingEnabled || !isFinancingConfigured(financing) || !(preco > 0)) return null;

  const parcelas = parcelasIniciais(financing);
  const entrada = entradaInicial(preco, financing);
  const resultado = resultadoDaSimulacao({ valor: preco, entrada, parcelas }, financing);

  return resultado.erro ? null : { parcelas, valor: resultado.installmentValue };
}
