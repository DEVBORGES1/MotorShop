import { useEffect, useState } from 'react';

/** Espera depois da última tecla antes de avisar: uma consulta por pausa, não por letra. */
export const ESPERA_DA_DIGITACAO_MS = 400;

/**
 * Valor de campo que só chega ao pai quando a pessoa para de digitar.
 *
 * O rascunho acompanha o valor quando ele muda por fora (chip removido,
 * "limpar filtros", botão voltar), em vez de manter o que estava digitado.
 *
 * @param {string} valor o valor vigente (em geral, o da URL)
 * @param {(novo: string) => void} onChange
 * @returns {[string, (novo: string) => void]}
 */
export function useRascunhoAdiado(valor, onChange) {
  const [rascunho, setRascunho] = useState(valor);

  useEffect(() => setRascunho(valor), [valor]);

  useEffect(() => {
    if (rascunho === valor) return undefined;

    const espera = setTimeout(() => onChange(rascunho), ESPERA_DA_DIGITACAO_MS);
    return () => clearTimeout(espera);
  }, [rascunho, valor, onChange]);

  return [rascunho, setRascunho];
}
