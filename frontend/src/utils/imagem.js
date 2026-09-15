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
