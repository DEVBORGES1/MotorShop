import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from '../../src/modules/auth/password.js';

describe('hash de senha', () => {
  it('usa argon2id', async () => {
    const hash = await hashPassword('uma-senha-bem-longa-123');
    expect(hash.startsWith('$argon2id$')).toBe(true);
  });

  it('nunca guarda a senha em texto puro', async () => {
    const senha = 'minha-senha-secreta-123';
    const hash = await hashPassword(senha);
    expect(hash).not.toContain(senha);
  });

  it('gera hashes diferentes para a mesma senha (salt por hash)', async () => {
    const [a, b] = await Promise.all([
      hashPassword('mesma-senha-123'),
      hashPassword('mesma-senha-123'),
    ]);
    expect(a).not.toBe(b);
  });

  it('verifica a senha correta e rejeita a errada', async () => {
    const hash = await hashPassword('senha-correta-123456');
    expect(await verifyPassword(hash, 'senha-correta-123456')).toBe(true);
    expect(await verifyPassword(hash, 'senha-errada-123456')).toBe(false);
  });

  it('devolve falso, sem lançar, quando o hash é inválido', async () => {
    expect(await verifyPassword('nao-e-um-hash', 'qualquer')).toBe(false);
  });

  it('compara mesmo sem hash — protege contra enumeração por tempo', async () => {
    // Usuário inexistente: precisa devolver falso E gastar tempo comparável.
    const inicio = Date.now();
    const resultado = await verifyPassword(null, 'qualquer-senha');
    const decorrido = Date.now() - inicio;

    expect(resultado).toBe(false);
    // Uma comparação real leva dezenas de ms; um retorno imediato (< 5 ms)
    // significaria que o caminho "usuário não existe" é distinguível por tempo.
    expect(decorrido).toBeGreaterThan(5);
  });
});
