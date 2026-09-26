import mongoose from 'mongoose';

import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { createAllIndexes } from '../config/indexes.js';

/**
 * Cria os índices declarados nos schemas de TODOS os modelos
 * (config/indexes.js).
 *
 * `autoIndex` fica desligado em produção (construir índice a cada início é
 * custo desnecessário e pode travar o banco com dados grandes), então a
 * criação é um passo explícito do deploy. Rodar de novo não faz mal: índice
 * que já existe fica como está.
 */
async function run() {
  const connected = await connectDatabase();
  if (!connected) {
    console.error('MONGODB_URI não definida — configure o .env antes de criar os índices.');
    process.exitCode = 1;
    return;
  }

  for (const { collection, indexes } of await createAllIndexes()) {
    console.log(`\n${collection}:`);
    for (const index of indexes) {
      const extras = [index.unique && 'único', index.ttl != null && `expira em ${index.ttl}s`]
        .filter(Boolean)
        .join(', ');
      console.log(
        `  ✓ ${index.name}  ${JSON.stringify(index.key)}${extras ? `  (${extras})` : ''}`,
      );
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
