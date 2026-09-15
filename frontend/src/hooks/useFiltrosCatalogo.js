import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { escreverParams, FILTROS_VAZIOS, lerFiltros } from '@/utils/catalogo.js';

/**
 * Filtros do catálogo, guardados na URL.
 *
 * Não existe cópia em `useState`: dois lugares guardando o mesmo filtro é como
 * o botão "voltar" do navegador deixa de funcionar. A URL manda, o componente
 * lê.
 */
export function useFiltrosCatalogo() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filtros = useMemo(() => lerFiltros(searchParams), [searchParams]);

  const aplicar = useCallback(
    (mudancas) => {
      const atual = lerFiltros(searchParams);

      // Trocar qualquer filtro volta para a primeira página: manter a página 4
      // de um resultado que agora tem duas é uma tela vazia sem explicação.
      const mudouFiltro = Object.keys(mudancas).some((chave) => chave !== 'page');
      const proximo = {
        ...atual,
        ...mudancas,
        page: mudancas.page ?? (mudouFiltro ? 1 : atual.page),
      };

      // `replace` nas trocas de filtro: sem isso, mexer em cinco filtros cria
      // cinco entradas no histórico e o "voltar" precisa de cinco toques.
      setSearchParams(escreverParams(proximo), { replace: mudouFiltro });
    },
    [searchParams, setSearchParams],
  );

  const alternarNaLista = useCallback(
    (chave, valor) => {
      const atual = lerFiltros(searchParams)[chave] ?? [];
      const proximo = atual.includes(valor)
        ? atual.filter((item) => item !== valor)
        : [...atual, valor];

      aplicar({ [chave]: proximo });
    },
    [searchParams, aplicar],
  );

  const limpar = useCallback(
    () => setSearchParams(escreverParams(FILTROS_VAZIOS)),
    [setSearchParams],
  );

  return { filtros, aplicar, alternarNaLista, limpar };
}
