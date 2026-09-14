/**
 * Dinheiro é armazenado em **centavos inteiros** (decisão D-04).
 *
 * `float` erra em aritmética decimal (`0.1 + 0.2 !== 0.3`), e erro de
 * arredondamento em preço vira divergência de catálogo. A API fala **reais** na
 * borda; o banco guarda centavos. Toda conversão passa por aqui — é o que
 * impede o clássico erro de fator 100.
 */

/** @param {number} reais @returns {number} centavos inteiros */
export function toCents(reais) {
  return Math.round(reais * 100);
}

/** @param {number} cents @returns {number} reais com duas casas */
export function toReais(cents) {
  return cents / 100;
}
