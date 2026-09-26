/**
 * Navegação da galeria de fotos, sem React.
 *
 * Teclado e gesto são as partes da galeria que quebram sem ninguém perceber
 * (a seta que não volta da primeira foto, o arraste vertical que troca de
 * imagem enquanto a pessoa só queria rolar a página). Como funções puras,
 * são testadas sem navegador.
 */

/** Índice vizinho, dando a volta nas pontas: da última, "próxima" vai à primeira. */
export function indiceVizinho(atual, total, passo) {
  if (total <= 0) return 0;
  return (((atual + passo) % total) + total) % total;
}

const TECLAS = {
  ArrowLeft: 'anterior',
  ArrowRight: 'proxima',
  Home: 'primeira',
  End: 'ultima',
};

/**
 * Ação de uma tecla dentro da galeria. `Esc` não está aqui: quem fecha o modal
 * é o próprio `<dialog>`, pelo evento `cancel`.
 *
 * @returns {'anterior'|'proxima'|'primeira'|'ultima'|null}
 */
export function acaoDaTecla(tecla) {
  return TECLAS[tecla] ?? null;
}

/** Novo índice depois de uma ação de teclado. */
export function indiceAposAcao(acao, atual, total) {
  switch (acao) {
    case 'anterior':
      return indiceVizinho(atual, total, -1);
    case 'proxima':
      return indiceVizinho(atual, total, 1);
    case 'primeira':
      return 0;
    case 'ultima':
      return Math.max(total - 1, 0);
    default:
      return atual;
  }
}

/** Deslocamento horizontal mínimo, em px, para o arraste contar como troca. */
const LIMIAR_ARRASTE = 50;

/**
 * Direção de um arraste: `1` avança (dedo para a esquerda), `-1` volta, `0`
 * ignora. Arraste mais vertical que horizontal é rolagem da página, não troca
 * de foto.
 */
export function direcaoDoArraste(dx, dy, limiar = LIMIAR_ARRASTE) {
  if (Math.abs(dx) < limiar || Math.abs(dy) > Math.abs(dx)) return 0;
  return dx < 0 ? 1 : -1;
}
