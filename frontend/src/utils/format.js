const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const NUMERO = new Intl.NumberFormat('pt-BR');

/** A API já entrega reais; aqui só se formata para exibição. */
export const formatarPreco = (reais) => (reais == null ? '—' : BRL.format(reais));

export const formatarKm = (km) => (km == null ? '—' : `${NUMERO.format(km)} km`);

export const formatarCilindrada = (cc) => (cc == null ? '—' : `${NUMERO.format(cc)} cc`);

export const formatarData = (iso) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { dateStyle: 'short' }) : '—';
