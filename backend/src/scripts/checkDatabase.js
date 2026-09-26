import mongoose from 'mongoose';

import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { INDEXED_MODELS } from '../config/indexes.js';
import { Lead } from '../modules/leads/lead.model.js';
import { Moto } from '../modules/motos/moto.model.js';
import { StoreSettings } from '../modules/store/store.model.js';
import { User } from '../modules/users/user.model.js';

/**
 * Confere um banco: o que tem dentro e se está operável.
 *
 * Usado para provar uma restauração de backup (restaura num cluster novo e
 * roda isto apontando para ele) e depois de cada deploy. Só lê — não muda
 * nada. Falha (código 1) se faltar índice, loja ou administrador ativo.
 */
async function run() {
  if (!(await connectDatabase())) {
    console.error('MONGODB_URI não definida.');
    process.exitCode = 1;
    return;
  }

  const problemas = [];
  const [porStatus, leads, admins, loja] = await Promise.all([
    Moto.aggregate([{ $group: { _id: '$status', total: { $sum: 1 } } }]),
    Lead.countDocuments(),
    User.countDocuments({ role: 'SUPER_ADMIN', active: true }),
    StoreSettings.findOne().select('name').lean(),
  ]);

  console.log(`Banco: ${mongoose.connection.name}`);
  console.log(`Loja: ${loja?.name ?? '(não configurada)'}`);
  console.log(
    `Motos: ${porStatus.map(({ _id, total }) => `${_id} ${total}`).join(' · ') || 'nenhuma'}`,
  );
  console.log(`Leads: ${leads}`);
  console.log(`Administradores (SUPER_ADMIN ativos): ${admins}`);

  if (!loja) problemas.push('loja não configurada');
  if (!admins) problemas.push('nenhum SUPER_ADMIN ativo — rode npm run create:superadmin');

  for (const model of INDEXED_MODELS) {
    const existentes = await model.collection.indexes().catch(() => []);
    const declarados = model.schema.indexes().length;
    const criados = existentes.filter((i) => i.name !== '_id_').length;
    if (criados < declarados) {
      problemas.push(
        `${model.collection.collectionName}: ${criados} de ${declarados} índices — rode npm run db:indexes`,
      );
    }
  }

  if (problemas.length) {
    console.error(`\n✗ ${problemas.length} problema(s):\n  - ${problemas.join('\n  - ')}`);
    process.exitCode = 1;
  } else {
    console.log('\n✓ Banco íntegro: loja, administrador e todos os índices presentes.');
  }
}

run()
  .catch((error) => {
    console.error('Falha ao conferir o banco:', error.message);
    process.exitCode = 1;
  })
  .finally(disconnectDatabase);
