import mongoose from 'mongoose';

import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { Brand } from '../modules/brands/brand.model.js';
import { Moto } from '../modules/motos/moto.model.js';

/**
 * Cria os índices declarados nos schemas.
 *
 * `autoIndex` fica desligado em produção (construir índice a cada deploy é
 * custo desnecessário), então a criação é um passo explícito do deploy.
 */
async function run() {
  const connected = await connectDatabase();
  if (!connected) {
    console.error('MONGODB_URI não definida — configure o .env antes de criar os índices.');
    process.exitCode = 1;
    return;
  }

  for (const model of [Brand, Moto]) {
    console.log(`\n${model.collection.collectionName}:`);
    await model.createIndexes();
    for (const index of await model.collection.indexes()) {
      console.log(`  ✓ ${index.name}  ${JSON.stringify(index.key)}`);
    }
  }

  console.log('\nÍndices criados.');
}

run()
  .catch((error) => {
    console.error('Falha ao criar índices:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
    await mongoose.connection.close();
  });
