import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Carrega dados de uma função assíncrona, com estado de carregando/erro.
 *
 * Mantém a chamada HTTP fora dos componentes e evita repetir o mesmo
 * `useEffect` em cada página. O cache de verdade (React Query) entra na FASE 4,
 * quando o catálogo público justificar.
 *
 * @param {() => Promise<unknown>} fetcher
 * @param {Array<unknown>} deps
 * @param {{ inicial?: unknown, erroInicial?: { status: number, message: string } }} [opcoes]
 */
export function useAsyncData(fetcher, deps = [], { inicial, erroInicial } = {}) {
  const [data, setData] = useState(inicial ?? null);
  const [error, setError] = useState(erroInicial ?? null);
  const [isLoading, setIsLoading] = useState(inicial === undefined && !erroInicial);
  const [tentativa, setTentativa] = useState(0);
  // Com dado (ou erro) inicial vindo do servidor, a primeira busca é
  // dispensável — e o primeiro render sai igual ao HTML que o servidor montou.
  const pularPrimeira = useRef(inicial !== undefined || Boolean(erroInicial));

  const refetch = useCallback(() => setTentativa((n) => n + 1), []);

  useEffect(() => {
    if (pularPrimeira.current) {
      pularPrimeira.current = false;
      return undefined;
    }
    let ativo = true;
    setIsLoading(true);
    setError(null);

    Promise.resolve(fetcher())
      .then((resultado) => ativo && setData(resultado))
      .catch((causa) => ativo && setError(causa))
      .finally(() => ativo && setIsLoading(false));

    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tentativa]);

  return { data, error, isLoading, refetch, setData };
}
