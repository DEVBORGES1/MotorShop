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
    width: capa.width,
    height: capa.height,
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

// --- Entrega otimizada (ARCHITECTURE §10.5) ---------------------------------

/**
 * Larguras geradas por contexto e o `sizes` que diz ao navegador quanto da
 * tela a imagem ocupa. Com isso o celular baixa a de 480 px, não a de 2560.
 */
export const CONTEXTOS_DE_IMAGEM = Object.freeze({
  miniatura: { larguras: [160, 320], sizes: '160px' },
  card: {
    larguras: [320, 480, 640, 960],
    sizes: '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw',
  },
  galeria: {
    larguras: [640, 960, 1280, 1920],
    sizes: '(min-width: 1024px) 60vw, 100vw',
  },
  ampliada: { larguras: [960, 1280, 1920, 2560], sizes: '100vw' },
});

const MARCA_DE_ENTREGA = '/image/upload/';

/**
 * URL redimensionada, em AVIF/WebP conforme o navegador (`f_auto`) e com
 * qualidade adaptativa (`q_auto`).
 *
 * Só reescreve URLs do provedor de imagens; qualquer outra (foto de
 * demonstração, provedor futuro) volta como veio — a página continua
 * funcionando, só sem a otimização.
 */
export function urlOtimizada(url, largura) {
  if (!url || !url.includes(MARCA_DE_ENTREGA)) return url;
  const [antes, depois] = url.split(MARCA_DE_ENTREGA);
  return `${antes}${MARCA_DE_ENTREGA}c_limit,f_auto,q_auto,w_${largura}/${depois}`;
}

/**
 * Atributos de `<img>` para um contexto: `src`, `srcSet`, `sizes` e as
 * dimensões (que reservam o espaço antes do download — sem salto de layout).
 */
export function atributosDeImagem(imagem, contexto) {
  if (!imagem?.url) return null;
  const { larguras, sizes } = CONTEXTOS_DE_IMAGEM[contexto];
  const otimizavel = imagem.url.includes(MARCA_DE_ENTREGA);

  return {
    src: urlOtimizada(imagem.url, larguras.at(-1)),
    srcSet: otimizavel
      ? larguras.map((largura) => `${urlOtimizada(imagem.url, largura)} ${largura}w`).join(', ')
      : undefined,
    sizes: otimizavel ? sizes : undefined,
    width: imagem.width,
    height: imagem.height,
  };
}
