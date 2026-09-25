/**
 * Entrega otimizada de imagens (ARCHITECTURE §10.5) — fonte única para o site
 * e para o servidor.
 *
 * O servidor pré-anuncia a foto principal da página da moto no HTML
 * (`<link rel="preload" imagesrcset>`), e a galeria a pede de novo ao montar.
 * Os dois precisam produzir exatamente o mesmo `srcset`; se diferirem numa
 * vírgula, o navegador baixa a foto duas vezes. Por isso a regra mora aqui.
 */

/**
 * Larguras por contexto e o `sizes` que diz ao navegador quanto da tela a
 * imagem ocupa: o celular baixa a de 640 px, não a de 2560.
 */
export const IMAGE_CONTEXTS = Object.freeze({
  thumbnail: { widths: [160, 320], sizes: '160px' },
  card: {
    widths: [320, 480, 640, 960],
    sizes: '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw',
  },
  gallery: { widths: [640, 960, 1280, 1920], sizes: '(min-width: 1024px) 60vw, 100vw' },
  zoom: { widths: [960, 1280, 1920, 2560], sizes: '100vw' },
});

const DELIVERY_MARK = '/image/upload/';

/**
 * URL redimensionada, em AVIF/WebP conforme o navegador (`f_auto`) e com
 * qualidade adaptativa (`q_auto`). Só reescreve URLs do provedor de imagens;
 * qualquer outra volta como veio — funciona, só sem a otimização.
 */
export function optimizedImageUrl(url, width) {
  if (!url || !url.includes(DELIVERY_MARK)) return url;
  const [before, after] = url.split(DELIVERY_MARK);
  return `${before}${DELIVERY_MARK}c_limit,f_auto,q_auto,w_${width}/${after}`;
}

/**
 * Atributos de `<img>` para um contexto: `src`, `srcSet`, `sizes` e as
 * dimensões (que reservam o espaço antes do download — sem salto de layout).
 */
export function imageAttributes(image, context) {
  if (!image?.url) return null;
  const { widths, sizes } = IMAGE_CONTEXTS[context];
  const optimizable = image.url.includes(DELIVERY_MARK);

  return {
    src: optimizedImageUrl(image.url, widths.at(-1)),
    srcSet: optimizable
      ? widths.map((width) => `${optimizedImageUrl(image.url, width)} ${width}w`).join(', ')
      : undefined,
    sizes: optimizable ? sizes : undefined,
    width: image.width,
    height: image.height,
  };
}
