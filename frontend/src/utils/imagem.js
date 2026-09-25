/**
 * Escolha da foto de capa da moto.
 *
 * O cadastro guarda uma lista com ordem e um id de capa. Nem toda moto tem
 * capa definida, nem toda lista vem ordenada — e card sem foto não pode virar
 * card quebrado.
 */
export function imagemPrincipal(moto) {
  const imagens = moto?.images ?? [];
  if (!imagens.length) return null;

  const capa =
    imagens.find((imagem) => imagem.id === moto.mainImageId) ??
    [...imagens].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0];

  if (!capa?.url) return null;

  return {
    url: capa.url,
    alt: capa.alt || nomeDaMoto(moto),
  };
}

/** "Honda CB 500F" — o nome como o visitante lê, sem o ano. */
export function nomeDaMoto(moto) {
  return [moto?.brand?.name, moto?.model].filter(Boolean).join(' ');
}

/**
 * Fotos na ordem da galeria: a capa primeiro, as demais pela ordem do
 * cadastro. É a mesma foto que o visitante viu no card — abrir a página e dar
 * de cara com outra imagem parece que clicou na moto errada.
 *
 * @returns {Array<{id: string, url: string, alt: string, width?: number, height?: number}>}
 */
export function imagensDaGaleria(moto) {
  const nome = nomeDaMoto(moto);
  const imagens = [...(moto?.images ?? [])]
    .filter((imagem) => imagem?.url)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const capa = imagens.findIndex((imagem) => imagem.id === moto?.mainImageId);
  if (capa > 0) imagens.unshift(...imagens.splice(capa, 1));

  return imagens.map((imagem, indice) => ({
    id: imagem.id ?? String(indice),
    url: imagem.url,
    // Sem `alt` no cadastro, "foto 2 de 5" ainda diz algo a quem ouve a página.
    alt: imagem.alt || `${nome} — foto ${indice + 1} de ${imagens.length}`,
    width: imagem.width,
    height: imagem.height,
  }));
}
