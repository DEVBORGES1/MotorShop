import { RefreshToken } from '../modules/auth/refreshToken.model.js';
import { Brand } from '../modules/brands/brand.model.js';
import { Lead } from '../modules/leads/lead.model.js';
import { Moto } from '../modules/motos/moto.model.js';
import { StoreSettings } from '../modules/store/store.model.js';
import { User } from '../modules/users/user.model.js';

/**
 * Todos os modelos com índice declarado. Em produção o `autoIndex` fica
 * desligado (database.js) e os índices são criados por `npm run db:indexes`
 * no deploy — um modelo esquecido aqui ficaria sem índice nenhum. Os que mais
 * importam não são de desempenho: e-mail único do usuário, `jti` único da
 * sessão e a expiração automática das sessões vencidas (TTL).
 *
 * O teste `indexes.test.js` confere que cada índice declarado nos schemas
 * existe no banco depois de `createAllIndexes`.
 */
export const INDEXED_MODELS = Object.freeze([Brand, Moto, Lead, User, RefreshToken, StoreSettings]);

/** Cria os índices de todos os modelos e devolve, por coleção, os que existem. */
export async function createAllIndexes() {
  const report = [];
  for (const model of INDEXED_MODELS) {
    await model.createIndexes();
    report.push({
      collection: model.collection.collectionName,
      indexes: (await model.collection.indexes()).map(
        ({ name, key, unique, expireAfterSeconds }) => ({
          name,
          key,
          unique: Boolean(unique),
          ttl: expireAfterSeconds,
        }),
      ),
    });
  }
  return report;
}
