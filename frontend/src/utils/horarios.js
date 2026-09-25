/**
 * Horários de funcionamento no formulário de Configurações.
 *
 * A API guarda até sete linhas `{ weekday, opensAt, closesAt, closed }`; o
 * formulário mostra sempre os sete dias, cada um aberto ou fechado. A conversão
 * mora aqui, fora do componente, porque tem regras que valem teste: dia ausente
 * vira fechado, e uma semana inteira fechada significa "não exibir horários".
 */

/** Semana começando na segunda, como no rodapé do site. */
export const DIAS_SEMANA = [
  { weekday: 1, nome: 'Segunda' },
  { weekday: 2, nome: 'Terça' },
  { weekday: 3, nome: 'Quarta' },
  { weekday: 4, nome: 'Quinta' },
  { weekday: 5, nome: 'Sexta' },
  { weekday: 6, nome: 'Sábado' },
  { weekday: 0, nome: 'Domingo' },
];

const HORARIO_PADRAO = { opensAt: '08:00', closesAt: '18:00' };

/** Sete linhas para o formulário, a partir do que veio da API. */
export function horariosParaFormulario(businessHours = []) {
  const porDia = new Map(businessHours.map((dia) => [dia.weekday, dia]));

  return DIAS_SEMANA.map(({ weekday, nome }) => {
    const dia = porDia.get(weekday);
    const aberto = Boolean(dia && !dia.closed && dia.opensAt && dia.closesAt);

    return {
      weekday,
      nome,
      aberto,
      opensAt: aberto ? dia.opensAt : '',
      closesAt: aberto ? dia.closesAt : '',
    };
  });
}

/**
 * Abre um dia. Se ele não tem horário, copia o do primeiro dia aberto — quem
 * abre o sábado quase sempre começa do horário da semana e só ajusta o fim.
 */
export function abrirDia(linhas, weekday) {
  const modelo = linhas.find((linha) => linha.aberto && linha.opensAt && linha.closesAt);
  const base = modelo ? { opensAt: modelo.opensAt, closesAt: modelo.closesAt } : HORARIO_PADRAO;

  return linhas.map((linha) =>
    linha.weekday !== weekday
      ? linha
      : {
          ...linha,
          aberto: true,
          opensAt: linha.opensAt || base.opensAt,
          closesAt: linha.closesAt || base.closesAt,
        },
  );
}

/**
 * Erros por dia, no mesmo critério da API (`store.schema.js`), para mostrar
 * ao lado do campo em vez de devolver "businessHours.3.closesAt" do servidor.
 *
 * @returns {Record<number, string>} weekday → mensagem; vazio quando está tudo certo
 */
export function validarHorarios(linhas) {
  const erros = {};

  for (const linha of linhas) {
    if (!linha.aberto) continue;

    if (!linha.opensAt || !linha.closesAt) {
      erros[linha.weekday] = 'Informe abertura e fechamento';
    } else if (linha.closesAt <= linha.opensAt) {
      // "HH:MM" com zero à esquerda compara corretamente como texto.
      erros[linha.weekday] = 'O fechamento precisa ser depois da abertura';
    }
  }

  return erros;
}

/**
 * Linhas no formato da API. Nenhum dia aberto vira lista vazia: nenhuma loja
 * fecha a semana inteira, então isso só pode significar "não exibir horários"
 * — e o site esconde o bloco em vez de anunciar "Seg a Dom · Fechado".
 */
export function horariosParaEnvio(linhas) {
  if (!linhas.some((linha) => linha.aberto)) return [];

  return linhas.map(({ weekday, aberto, opensAt, closesAt }) => ({
    weekday,
    opensAt: aberto ? opensAt : null,
    closesAt: aberto ? closesAt : null,
    closed: !aberto,
  }));
}
