/**
 * Apresentação dos dados da loja (endereço e horários).
 *
 * Mora fora dos componentes porque a API entrega os campos crus — sete linhas
 * de horário, endereço em partes — e a forma de exibir se repete no cabeçalho,
 * no rodapé e na página de contato.
 */

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/** Semana começando na segunda, como se lê numa porta de loja. */
const ORDEM = [1, 2, 3, 4, 5, 6, 0];

/** "Rua Exemplo, 1200 · Centro" — pula o que a loja não preencheu. */
export function enderecoLinha(address = {}) {
  const rua = [address.street, address.number].filter(Boolean).join(', ');
  return [rua, address.district].filter(Boolean).join(' · ') || null;
}

/** "Videira · SC · 89560-000" */
export function cidadeLinha(address = {}) {
  return [address.city, address.state, address.zipCode].filter(Boolean).join(' · ') || null;
}

const faixa = (h) =>
  h.closed || !h.opensAt || !h.closesAt ? null : `${h.opensAt} às ${h.closesAt}`;

/**
 * Agrupa dias seguidos com o mesmo horário: sete linhas viram
 * "Seg a Sex · 08:00 às 18:00" e "Sáb · 08:00 às 12:00".
 *
 * @param {Array<{weekday:number, opensAt?:string, closesAt?:string, closed?:boolean}>} businessHours
 * @returns {Array<{dias: string, horario: string|null}>}
 */
export function horariosAgrupados(businessHours = []) {
  if (!businessHours.length) return [];

  const porDia = new Map(businessHours.map((h) => [h.weekday, h]));
  const grupos = [];

  for (const weekday of ORDEM) {
    const hoje = porDia.get(weekday);
    if (!hoje) continue;

    const horario = faixa(hoje);
    const ultimo = grupos.at(-1);

    // Só agrupa dias vizinhos na ordem exibida; um buraco no meio (loja fechada
    // na quarta, por exemplo) precisa aparecer como linha própria.
    if (ultimo && ultimo.horario === horario && ultimo.fimIndice === ORDEM.indexOf(weekday) - 1) {
      ultimo.fim = weekday;
      ultimo.fimIndice += 1;
      continue;
    }

    grupos.push({
      inicio: weekday,
      fim: weekday,
      fimIndice: ORDEM.indexOf(weekday),
      horario,
    });
  }

  return grupos.map(({ inicio, fim, horario }) => ({
    dias: inicio === fim ? DIAS[inicio] : `${DIAS[inicio]} a ${DIAS[fim]}`,
    horario,
  }));
}
