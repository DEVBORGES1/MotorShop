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

/** "+5549999998888" → "(49) 99999-8888". O que não reconhece, devolve como veio. */
export function formatarTelefone(telefone) {
  const digitos = String(telefone ?? '').replace(/\D/g, '');
  const nacional = digitos.startsWith('55') && digitos.length >= 12 ? digitos.slice(2) : digitos;

  if (nacional.length === 11)
    return `(${nacional.slice(0, 2)}) ${nacional.slice(2, 7)}-${nacional.slice(7)}`;
  if (nacional.length === 10)
    return `(${nacional.slice(0, 2)}) ${nacional.slice(2, 6)}-${nacional.slice(6)}`;
  return telefone ?? '—';
}

export const formatarDataHora = (iso) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

const PERCENTUAL = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

/** 1.79 → "1,79%". Recebe o número já em pontos percentuais. */
export const formatarPercentual = (valor) => (valor == null ? '—' : `${PERCENTUAL.format(valor)}%`);
