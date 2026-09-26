import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createAllIndexes, INDEXED_MODELS } from '../../src/config/indexes.js';
import { connect, disconnect, skipWithoutDb } from '../helpers/db.js';

/**
 * Em produção o `autoIndex` fica desligado: o que não for criado por
 * `npm run db:indexes` (createAllIndexes) não existe. Este teste garante que
 * o script cobre TODOS os índices declarados nos schemas.
 */
describe.skipIf(skipWithoutDb)('índices criados pelo deploy', () => {
  let relatorio;

  beforeAll(async () => {
    await connect();
    await mongoose.connection.dropDatabase();
    relatorio = await createAllIndexes();
  });
  afterAll(disconnect);

  const doBanco = (colecao) => relatorio.find((r) => r.collection === colecao).indexes;

  it('cria, em cada coleção, pelo menos os índices declarados no schema', () => {
    for (const model of INDEXED_MODELS) {
      const declarados = model.schema.indexes().length;
      // O índice padrão `_id_` não é declarado no schema.
      const criados = doBanco(model.collection.collectionName).filter((i) => i.name !== '_id_');
      expect(criados.length, model.modelName).toBeGreaterThanOrEqual(declarados);
    }
  });

  it('os que protegem dados existem com a regra certa', () => {
    expect(doBanco('users')).toContainEqual(
      expect.objectContaining({ key: { email: 1 }, unique: true }),
    );
    expect(doBanco('refreshtokens')).toContainEqual(
      expect.objectContaining({ key: { jti: 1 }, unique: true }),
    );
    // Sessão vencida é apagada sozinha pelo banco.
    expect(doBanco('refreshtokens')).toContainEqual(
      expect.objectContaining({ key: { expiresAt: 1 }, ttl: 0 }),
    );
    expect(doBanco('motos')).toContainEqual(
      expect.objectContaining({ key: { slug: 1 }, unique: true }),
    );
  });

  it('rodar de novo não falha (o deploy roda a cada vez)', async () => {
    await expect(createAllIndexes()).resolves.toHaveLength(INDEXED_MODELS.length);
  });
});
