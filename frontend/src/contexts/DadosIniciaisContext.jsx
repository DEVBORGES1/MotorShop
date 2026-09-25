import { createContext, useContext, useEffect } from 'react';

/**
 * Dados de partida da página: o que o servidor já buscou para montar o HTML.
 *
 * - `store` — configuração da loja;
 * - `moto` — na página de uma moto, a própria moto (`null` se não existe);
 * - `origem` — a origem da requisição (`https://loja.com.br`), para montar
 *   URLs absolutas no servidor, onde não há `window.location`.
 *
 * No servidor, cada requisição recebe o seu objeto (`entry-server.jsx`); no
 * navegador, vem do bloco `#dados-iniciais` do HTML (`lerDadosIniciais`).
 * Por isso é contexto, e não variável de módulo: no servidor o módulo é o
 * mesmo para todos os visitantes, e a moto de um vazaria para a página de
 * outro.
 *
 * O servidor renderiza com estes dados e o navegador hidrata com os mesmos —
 * se divergissem, o React descartaria o HTML do servidor.
 */
const DadosIniciaisContext = createContext({});

export function DadosIniciaisProvider({ dados, children }) {
  return <DadosIniciaisContext.Provider value={dados}>{children}</DadosIniciaisContext.Provider>;
}

/** Lê o bloco `#dados-iniciais` do HTML. Sem ele (Vite em desenvolvimento), `{}`. */
export function lerDadosIniciais() {
  try {
    const bloco = document.getElementById('dados-iniciais');
    return bloco ? JSON.parse(bloco.textContent) : {};
  } catch {
    return {};
  }
}

/** Configuração da loja embutida no HTML, ou `null`. */
export const useStoreInicial = () => useContext(DadosIniciaisContext).store ?? null;

/**
 * A moto da URL, se o servidor já a buscou — e só no primeiro uso: depois,
 * sair e voltar a esta moto busca dados atuais na API, não os do HTML antigo.
 * A marcação de "usada" fica num efeito, porque renderizar não pode ter efeito
 * colateral (e o servidor, que não roda efeitos, renderiza com os dados).
 *
 * @returns {{ moto: object } | { naoEncontrada: true } | undefined}
 */
export function useMotoInicial(slug) {
  const dados = useContext(DadosIniciaisContext);
  const disponivel = !dados.motoUsada && 'moto' in dados && dados.motoSlug === slug;

  useEffect(() => {
    dados.motoUsada = true;
  }, [dados]);

  if (!disponivel) return undefined;
  return dados.moto ? { moto: dados.moto } : { naoEncontrada: true };
}

/**
 * Base das URLs absolutas: o `siteUrl` configurado pela loja ou, sem ele, a
 * origem em que o site está aberto (no servidor, a da requisição).
 */
export function useBaseDoSite(store) {
  const { origem } = useContext(DadosIniciaisContext);
  const base = store?.seo?.siteUrl || origem || globalThis.location?.origin || '';
  return base.replace(/\/+$/, '');
}
