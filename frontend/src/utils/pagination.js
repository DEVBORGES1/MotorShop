/**
 * Monta a sequência de páginas exibida na paginação.
 *
 * Fica fora do componente porque é a única parte com regra de verdade — o
 * resto é marcação. Com 40 páginas, renderizar todas quebra o layout no
 * celular; a janela abaixo mantém primeira, última, a atual e os vizinhos,
 * com reticências no lugar do que foi cortado.
 *
 * @param {number} current página atual (base 1)
 * @param {number} total   total de páginas
 * @param {number} siblings quantas páginas mostrar de cada lado da atual
 * @returns {Array<number|'gap'>} páginas e marcadores de corte
 */
export function pageItems(current, total, siblings = 1) {
  if (!Number.isFinite(total) || total < 1) return [];

  const page = Math.min(Math.max(Math.trunc(current) || 1, 1), total);

  // Largura máxima da janela: primeira, última, atual, os vizinhos dos dois
  // lados e duas reticências. Enquanto o total couber nisso, cortar não
  // encurta nada — só esconde páginas.
  const janela = siblings * 2 + 5;
  if (total <= janela) return Array.from({ length: total }, (_, i) => i + 1);

  // Primeira, última, atual e vizinhos. O Set resolve a sobreposição perto
  // das bordas sem uma cascata de `if`.
  const keep = new Set([1, total, page]);
  for (let i = 1; i <= siblings; i += 1) {
    if (page - i >= 1) keep.add(page - i);
    if (page + i <= total) keep.add(page + i);
  }

  const pages = [...keep].sort((a, b) => a - b);
  const items = [];

  pages.forEach((n, i) => {
    // Um buraco de exatamente uma página vira a própria página: "1 … 3" ocupa
    // o mesmo espaço que "1 2 3" e esconde informação sem economizar nada.
    const previous = pages[i - 1];
    if (i > 0) {
      if (n - previous === 2) items.push(previous + 1);
      else if (n - previous > 2) items.push('gap');
    }
    items.push(n);
  });

  return items;
}
