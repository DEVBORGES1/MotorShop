import { describe, expect, it, vi } from 'vitest';

import { criarTrava } from './trava.js';

describe('criarTrava', () => {
  it('clique duplo: a segunda chamada é ignorada enquanto a primeira não termina', async () => {
    const executar = criarTrava();
    let concluir;
    const envio = vi.fn(() => new Promise((resolve) => (concluir = resolve)));

    const primeira = executar(envio);
    const segunda = await executar(envio);
    concluir();

    expect(segunda).toEqual({ ignorada: true });
    expect(await primeira).toEqual({ ignorada: false });
    expect(envio).toHaveBeenCalledTimes(1);
  });

  it('libera de novo depois de terminar, inclusive com erro', async () => {
    const executar = criarTrava();

    await expect(executar(() => Promise.reject(new Error('rede')))).rejects.toThrow('rede');
    const envio = vi.fn(() => Promise.resolve());
    await executar(envio);

    expect(envio).toHaveBeenCalledTimes(1);
  });
});
