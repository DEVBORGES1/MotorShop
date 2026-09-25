/**
 * Trava de execução única: enquanto uma chamada está em andamento, as
 * seguintes são ignoradas. É o que impede o clique duplo de enviar duas vezes.
 *
 * @returns {(tarefa: () => Promise<unknown>) => Promise<{ ignorada: boolean }>}
 */
export function criarTrava() {
  let ocupada = false;

  return async (tarefa) => {
    if (ocupada) return { ignorada: true };
    ocupada = true;
    try {
      await tarefa();
      return { ignorada: false };
    } finally {
      ocupada = false;
    }
  };
}
