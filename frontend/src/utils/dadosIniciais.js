/**
 * Dados de partida que o servidor embute no HTML (`#dados-iniciais`): a
 * configuração da loja e, na página de uma moto, a própria moto.
 *
 * Sem isto, o site abre, baixa o JS, e só então pede a loja e a moto à API —
 * a manchete da página (o LCP) esperava essa segunda viagem. Com isto, o
 * primeiro render já tem o conteúdo.
 */

let dados;

function ler() {
  if (dados !== undefined) return dados;
  try {
    const bloco =
      typeof document === 'undefined' ? null : document.getElementById('dados-iniciais');
    dados = bloco ? JSON.parse(bloco.textContent) : {};
  } catch {
    dados = {};
  }
  return dados;
}

/** Configuração da loja embutida no HTML, ou `null` (desenvolvimento com Vite). */
export const storeInicial = () => ler().store ?? null;

/**
 * A moto embutida, se for a da URL — e só uma vez: depois de usada, navegar
 * para outra moto e voltar busca dados atuais na API, não os do HTML antigo.
 */
export function consumirMotoInicial(slug) {
  const atual = ler();
  if (atual.moto?.slug !== slug) return undefined;
  const moto = atual.moto;
  atual.moto = null;
  return moto;
}
