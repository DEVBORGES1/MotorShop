/**
 * Período do filtro de leads: `<input type="date">` entrega "2026-09-25", e a
 * API espera data-hora com fuso.
 *
 * "De 25/09" é a meia-noite do dia 25 **no fuso de quem consulta**, e "até
 * 25/09" é o último milissegundo do mesmo dia. Mandar só a data deixaria o
 * servidor interpretá-la em UTC, e os leads das 21h às 23h59 de Brasília
 * cairiam no dia seguinte.
 *
 * @returns {{ de?: string, ate?: string }} ISO 8601 em UTC
 */
export function periodoParaApi(de, ate) {
  const periodo = {};
  if (de) periodo.de = new Date(`${de}T00:00:00`).toISOString();
  if (ate) periodo.ate = new Date(`${ate}T23:59:59.999`).toISOString();
  return periodo;
}
