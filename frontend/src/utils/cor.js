/**
 * Cálculos de cor para aplicar o tema da loja em tempo de execução.
 *
 * A loja configura **uma** cor (a primária). Os tons de hover e de texto sobre
 * ela são derivados aqui, e não pedidos ao lojista: ninguém vai escolher três
 * variações coerentes num seletor de cor, e a escolha errada produz botão
 * ilegível — que é justamente o que o cálculo de contraste abaixo impede.
 */

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** `#4CD62B` ou `#4C0` → `[76, 214, 43]`. `null` se não for hex válido. */
export function hexParaRgb(hex) {
  const casou = HEX.exec(String(hex ?? '').trim());
  if (!casou) return null;

  const valor =
    casou[1].length === 3
      ? casou[1]
          .split('')
          .map((c) => c + c)
          .join('')
      : casou[1];

  return [0, 2, 4].map((i) => parseInt(valor.slice(i, i + 2), 16));
}

const doisDigitos = (n) => Math.round(n).toString(16).padStart(2, '0');
const rgbParaHex = ([r, g, b]) => `#${doisDigitos(r)}${doisDigitos(g)}${doisDigitos(b)}`;
const limitar = (n, min, max) => Math.min(Math.max(n, min), max);

/** Luminância relativa da WCAG. */
function luminancia(hex) {
  const rgb = hexParaRgb(hex);
  if (!rgb) return null;

  const [r, g, b] = rgb
    .map((c) => c / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razão de contraste da WCAG entre duas cores (1 a 21). */
export function contraste(a, b) {
  const la = luminancia(a);
  const lb = luminancia(b);
  if (la == null || lb == null) return null;

  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Clareia (delta > 0) ou escurece (delta < 0) mantendo o matiz.
 * @param {string} hex
 * @param {number} delta pontos percentuais de luminosidade HSL
 */
export function ajustarLuminosidade(hex, delta) {
  const rgb = hexParaRgb(hex);
  if (!rgb) return null;

  const [r, g, b] = rgb.map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  const novoL = limitar(l + delta / 100, 0, 1);
  const c = (1 - Math.abs(2 * novoL - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = novoL - c / 2;

  const faixa = Math.floor(h / 60) % 6;
  const bruto = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ][faixa];

  return rgbParaHex(bruto.map((v) => (v + m) * 255));
}

/** Preto ou branco do tema — o que for mais legível sobre `hex`. */
export function corDeTextoSobre(hex, { escuro = '#07120a', claro = '#f2f4f1' } = {}) {
  const comEscuro = contraste(hex, escuro);
  if (comEscuro == null) return claro;

  return comEscuro >= contraste(hex, claro) ? escuro : claro;
}

/** O fundo mais claro sobre o qual a cor da marca aparece como texto (`surface-2`). */
const FUNDO_MAIS_CLARO = '#191d19';
/** 4,5 é o mínimo AA para texto pequeno; a folga cobre o arredondamento do hex. */
const CONTRASTE_DE_TEXTO = 4.6;

/**
 * A cor da marca vira texto (links, menu ativo, rótulos) sobre o fundo escuro
 * do site. Uma cor escura — azul-marinho, vinho, roxo — sumiria ali. Em vez de
 * recusar a escolha do lojista, ela é clareada no mesmo matiz até ficar
 * legível; cores que já passam saem intactas.
 */
export function corLegivel(hex) {
  if (!hexParaRgb(hex)) return null;

  let cor = hex;
  // 50 passos de 2 pontos cobrem do preto ao branco.
  for (let i = 0; i < 50 && contraste(cor, FUNDO_MAIS_CLARO) < CONTRASTE_DE_TEXTO; i++) {
    cor = ajustarLuminosidade(cor, 2);
  }
  return cor;
}

/**
 * Variáveis CSS derivadas da cor primária da loja.
 * Devolve `{}` quando a cor é inválida ou ausente — aí vale o tema padrão.
 */
export function variaveisDoTema(primaria) {
  const marca = corLegivel(primaria);
  if (!marca) return {};

  return {
    '--color-brand-500': marca,
    '--color-brand-400': ajustarLuminosidade(marca, 12),
    '--color-brand-600': ajustarLuminosidade(marca, -10),
    '--color-on-brand': corDeTextoSobre(marca),
  };
}
