import mongoose from 'mongoose';
import { inject } from 'vitest';

import { Brand } from '../../src/modules/brands/brand.model.js';
import { Moto } from '../../src/modules/motos/moto.model.js';

/** URI do Mongo de teste, ou `null` quando indisponível neste ambiente. */
export const mongoUri = inject('mongoUri');

/** Use como `describe.skipIf(skipWithoutDb)` nos testes que exigem banco. */
export const skipWithoutDb = !mongoUri;

export async function connect() {
  await mongoose.connect(mongoUri, { dbName: `test_${Date.now()}` });
  // Os índices precisam existir para os testes de unicidade e de `explain`.
  await Promise.all([Brand.createIndexes(), Moto.createIndexes()]);
}

export async function disconnect() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}

export async function clear() {
  await Promise.all([Moto.deleteMany({}), Brand.deleteMany({})]);
}
