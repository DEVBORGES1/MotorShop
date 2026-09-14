import { useCallback, useEffect, useState } from 'react';

import { fetchHealth } from '@/services/healthService.js';

/**
 * Encapsula a consulta ao health check da API.
 *
 * Mantém a chamada HTTP fora dos componentes: a página consome estado, não
 * sabe que existe Axios.
 *
 * @returns {{ data: object | null, error: Error | null, isLoading: boolean, refetch: () => void }}
 */
export function useHealth() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  const refetch = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    setError(null);

    fetchHealth()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((cause) => {
        if (active) setError(cause);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    // Evita atualizar estado de um componente já desmontado.
    return () => {
      active = false;
    };
  }, [attempt]);

  return { data, error, isLoading, refetch };
}
