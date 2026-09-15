/**
 * Converte o usuário na forma exposta pela API.
 * `passwordHash` nunca chega aqui (`select: false`), mas é removido de novo por
 * garantia: uma camada só de proteção é uma camada de distância do vazamento.
 */
export function serializeUser(user) {
  if (!user) return null;

  const { _id, __v, passwordHash: _passwordHash, ...rest } = user;
  return { id: String(_id), ...rest };
}

export const serializeUserList = (users) => users.map(serializeUser);
