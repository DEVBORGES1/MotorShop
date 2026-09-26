import { FUEL_LABEL, TRANSMISSION_LABEL } from '@motorshop/shared';

import { formatarCilindrada, formatarKm } from './format.js';

/** Caminho da página da moto no site. */
export const caminhoDaMoto = (slug) => `/motos/${encodeURIComponent(slug)}`;

/** Formulário da moto no painel — atalho da equipe a partir do site. */
export const caminhoDeEdicao = (id) => `/admin/motos/${encodeURIComponent(id)}/editar`;

/**
 * Endereço absoluto da página, para a mensagem do WhatsApp. `base` é o
 * `siteUrl` configurado pela loja ou, sem ele, a origem em que o site está
 * aberto.
 */
export function urlDaMoto(slug, base) {
  if (!slug || !base) return null;
  return `${String(base).replace(/\/+$/, '')}${caminhoDaMoto(slug)}`;
}

const vazio = (valor) => valor == null || valor === '';

/**
 * Ficha técnica, na ordem de leitura. Campo que o cadastro não tem some da
 * lista — nunca aparece "undefined", "null" ou um traço solto.
 *
 * `0 km` é dado (moto zero), não ausência: por isso o teste é `== null`, e não
 * falsidade.
 *
 * @returns {Array<{rotulo: string, valor: string}>}
 */
export function especificacoes(moto) {
  if (!moto) return [];

  const linhas = [
    ['Marca', moto.brand?.name],
    ['Modelo', moto.model],
    ['Versão', moto.version],
    ['Ano', moto.year],
    ['Quilometragem', vazio(moto.mileage) ? null : formatarKm(moto.mileage)],
    ['Cilindrada', vazio(moto.engineCapacity) ? null : formatarCilindrada(moto.engineCapacity)],
    ['Combustível', FUEL_LABEL[moto.fuel] ?? moto.fuel],
    ['Câmbio', TRANSMISSION_LABEL[moto.transmission] ?? moto.transmission],
    ['Cor', moto.color],
  ];

  return linhas
    .filter(([, valor]) => !vazio(valor))
    .map(([rotulo, valor]) => ({ rotulo, valor: String(valor) }));
}
