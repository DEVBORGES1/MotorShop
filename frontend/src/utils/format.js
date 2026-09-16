const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const NUMERO = new Intl.NumberFormat('pt-BR');

/** A API já entrega reais; aqui só se formata para exibição. */
export const formatarPreco = (reais) => (reais == null ? '—' : BRL.format(reais));

export const formatarKm = (km) => (km == null ? '—' : `${NUMERO.format(km)} km`);

export const formatarCilindrada = (cc) => (cc == null ? '—' : `${NUMERO.format(cc)} cc`);

export const formatarData = (iso) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { dateStyle: 'short' }) : '—';

/**
 * Iniciais para o avatar de texto do painel: "João Vitor Borges" → "JB".
 *
 * Usa a primeira e a última palavra, não as duas primeiras: em nome composto
 * ("Ana Paula Souza"), "AS" identifica melhor que "AP".
 */
export function iniciais(nome) {
  const palavras = String(nome ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!palavras.length) return '—';

  const primeira = palavras[0][0];
  const ultima = palavras.length > 1 ? palavras.at(-1)[0] : '';

  return (primeira + ultima).toUpperCase();
}
