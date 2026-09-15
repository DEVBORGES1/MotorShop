import argon2 from 'argon2';

/**
 * Hash de senha com **argon2id** (decisão D-03).
 *
 * Vencedor da Password Hashing Competition: o custo de memória o torna
 * resistente a ataque por GPU/ASIC, ao contrário de algoritmos que só custam
 * CPU. Também não tem o limite de 72 bytes do bcrypt.
 */

const OPTIONS = Object.freeze({
  type: argon2.argon2id,
  memoryCost: 19_456, // 19 MiB — mínimo recomendado pelo OWASP para argon2id
  timeCost: 2,
  parallelism: 1,
});

/**
 * Hash fictício usado para comparar mesmo quando o usuário não existe.
 * Sem isso, a resposta para "e-mail inexistente" voltaria muito mais rápido do
 * que para "senha errada", e essa diferença de tempo revela quais e-mails estão
 * cadastrados.
 */
let dummyHash = null;

export async function hashPassword(plain) {
  return argon2.hash(plain, OPTIONS);
}

/**
 * @param {string | null | undefined} hash  Hash armazenado, ou nulo se o usuário não existe.
 * @param {string} plain
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(hash, plain) {
  if (!hash) {
    // Gasta o mesmo tempo de uma verificação real e devolve falso.
    dummyHash ??= await hashPassword('comparacao-em-tempo-constante');
    await argon2.verify(dummyHash, plain).catch(() => false);
    return false;
  }

  return argon2.verify(hash, plain).catch(() => false);
}
