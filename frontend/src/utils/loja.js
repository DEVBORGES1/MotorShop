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

/** "Rua Exemplo, 1200, Sala 2 · Centro" — pula o que a loja não preencheu. */
export function enderecoLinha(address = {}) {
  const rua = [address.street, address.number, address.complement].filter(Boolean).join(', ');
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

// --- Localização e horário --------------------------------------------------

const paraMinutos = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const aberto = (dia) => dia && !dia.closed && dia.opensAt && dia.closesAt;

/**
 * Situação da loja agora, a partir dos horários configurados.
 *
 * Usa o relógio de quem visita: quem consulta a loja costuma estar no mesmo
 * fuso, e assim nenhum fuso é escrito no código de um produto revendável.
 * Como depende da hora, só deve ser chamada depois da montagem — o HTML gerado
 * no servidor não pode conter "aberto agora" de outra hora.
 *
 * @returns {{ aberto: boolean, texto: string } | null} `null` sem horários
 */
export function statusDeAbertura(businessHours = [], agora = new Date()) {
  const porDia = new Map(businessHours.map((h) => [h.weekday, h]));
  if (![...porDia.values()].some(aberto)) return null;

  const hoje = porDia.get(agora.getDay());
  const minutos = agora.getHours() * 60 + agora.getMinutes();

  if (aberto(hoje)) {
    if (minutos >= paraMinutos(hoje.opensAt) && minutos < paraMinutos(hoje.closesAt)) {
      return { aberto: true, texto: `Aberto agora · fecha às ${hoje.closesAt}` };
    }
    if (minutos < paraMinutos(hoje.opensAt)) {
      return { aberto: false, texto: `Fechado agora · abre hoje às ${hoje.opensAt}` };
    }
  }

  for (let passo = 1; passo <= 7; passo += 1) {
    const weekday = (agora.getDay() + passo) % 7;
    const dia = porDia.get(weekday);
    if (aberto(dia)) {
      const quando = passo === 1 ? 'amanhã' : DIAS[weekday];
      return { aberto: false, texto: `Fechado agora · abre ${quando} às ${dia.opensAt}` };
    }
  }

  return null;
}

/** Texto de busca do endereço para o mapa; `null` sem rua, não há o que marcar. */
export function consultaDoMapa(address = {}) {
  if (!address.street) return null;
  const rua = [address.street, address.number].filter(Boolean).join(', ');
  return [rua, address.district, address.city, address.state].filter(Boolean).join(', ');
}

/** Mapa para incorporar na página. Só é aberto depois de o visitante pedir. */
export function urlDoMapaIncorporado(address) {
  const consulta = consultaDoMapa(address);
  return consulta
    ? `https://www.google.com/maps?q=${encodeURIComponent(consulta)}&hl=pt-BR&output=embed`
    : null;
}

/** "Como chegar": o link que o lojista configurou ou, sem ele, uma busca pelo endereço. */
export function urlDeRota(address = {}) {
  if (address.mapsUrl) return address.mapsUrl;
  const consulta = consultaDoMapa(address);
  return consulta
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}`
    : null;
}
