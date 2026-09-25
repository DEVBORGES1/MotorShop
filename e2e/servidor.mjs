/**
 * Servidor do E2E: o MESMO processo de produção (API + site renderizado no
 * servidor), num banco só dele, com dados conhecidos.
 *
 * Banco: `E2E_MONGODB_URI` (a CI usa um contêiner mongo:7; localmente, um
 * Docker) ou, sem ela, um MongoDB em memória. O banco é apagado a cada
 * execução.
 *
 * Exige o build (`npm run build`): é o site de produção que o E2E testa.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { CLOUDINARY, CONTAS, LOJA, MARCAS, MOTOS, ORIGEM, PORTA } from './dados.mjs';

const raiz = fileURLToPath(new URL('..', import.meta.url));
for (const caminho of ['frontend/dist/index.html', 'frontend/dist-ssr/entry-server.js']) {
  if (!existsSync(`${raiz}${caminho}`)) {
    console.error(`E2E: ${caminho} não existe. Rode "npm run build" antes.`);
    process.exit(1);
  }
}

let uri = process.env.E2E_MONGODB_URI;
if (!uri) {
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  const mongo = await MongoMemoryServer.create();
  uri = mongo.getUri();
  process.on('SIGTERM', () => mongo.stop());
}

/** Mesmo servidor, banco próprio: nunca o de desenvolvimento. */
function bancoDoE2e(endereco) {
  const url = new URL(endereco);
  url.pathname = '/motorshop_e2e';
  return url.toString();
}

// O ambiente precisa estar pronto ANTES de importar o backend: a configuração
// é lida e validada na importação (backend/src/config/env.js).
Object.assign(process.env, {
  NODE_ENV: 'production',
  PORT: String(PORTA),
  MONGODB_URI: bancoDoE2e(uri),
  JWT_SECRET: 'segredo-jwt-do-e2e-com-bem-mais-de-32-caracteres',
  FRONTEND_URL: ORIGEM,
  TRUST_PROXY_HOPS: '0',
  LOG_LEVEL: 'warn',
  STORAGE_PROVIDER: 'cloudinary',
  CLOUDINARY_CLOUD_NAME: CLOUDINARY.cloudName,
  CLOUDINARY_API_KEY: CLOUDINARY.apiKey,
  CLOUDINARY_API_SECRET: CLOUDINARY.apiSecret,
  STORAGE_FOLDER: CLOUDINARY.pasta,
});

const { default: mongoose } = await import('mongoose');
const { hashPassword } = await import('../backend/src/modules/auth/password.js');
const { Brand } = await import('../backend/src/modules/brands/brand.model.js');
const { Moto } = await import('../backend/src/modules/motos/moto.model.js');
const { StoreSettings } = await import('../backend/src/modules/store/store.model.js');
const { User } = await import('../backend/src/modules/users/user.model.js');

await mongoose.connect(process.env.MONGODB_URI);
await mongoose.connection.dropDatabase();
await Promise.all([Brand.createIndexes(), Moto.createIndexes()]);

await StoreSettings.create(LOJA);
const passwordHash = await hashPassword(CONTAS.cadastro.password);
await User.insertMany(
  Object.values(CONTAS).map(({ name, email }) => ({
    name,
    email,
    role: 'SUPER_ADMIN',
    active: true,
    passwordHash,
  })),
);
const marcas = Object.fromEntries(
  (await Brand.insertMany(MARCAS)).map((marca) => [marca.slug, marca._id]),
);
await Moto.insertMany(
  MOTOS.map(({ marca, ...moto }) => ({
    ...moto,
    brand: marcas[marca],
    fuel: 'GASOLINE',
    transmission: 'MANUAL',
    status: 'AVAILABLE',
  })),
);
await mongoose.disconnect();
console.log(`E2E: banco preparado (${MOTOS.length} motos); subindo em ${ORIGEM}`);

// Sobe exatamente o que sobe em produção.
await import('../backend/src/server.js');
