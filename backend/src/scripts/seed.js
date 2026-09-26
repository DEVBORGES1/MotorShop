import { FUEL, MOTO_STATUS, TRANSMISSION } from '@motorshop/shared';
import mongoose from 'mongoose';

import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { env } from '../config/env.js';
import { createAllIndexes } from '../config/indexes.js';
import { Brand } from '../modules/brands/brand.model.js';
import { Moto } from '../modules/motos/moto.model.js';
import { StoreSettings } from '../modules/store/store.model.js';
import { toCents } from '../utils/money.js';
import { buildSlug } from '../utils/slug.js';

/**
 * Popula a loja fictícia de demonstração.
 *
 * Sem fotos: elas entram pelo painel (o arquivo vai direto ao provedor de
 * imagens). Preços em reais aqui, convertidos para centavos na gravação.
 *
 * Idempotente: limpa motos e marcas antes de inserir. Em produção, só com a
 * confirmação explícita `--confirmar-apagar-estoque` — é o caso da loja de
 * demonstração (FASE 12), nunca o de uma loja com estoque real.
 */

const CONFIRMACAO = '--confirmar-apagar-estoque';

/** Configuração da loja de demonstração, criada só se ainda não houver loja. */
const LOJA_DEMO = {
  name: 'MotorShop Demonstração',
  slogan: 'Motos revisadas, prontas para rodar',
  contact: { whatsapp: '11999990000', email: 'contato@demonstracao.invalid' },
  address: { city: 'São Paulo', state: 'SP' },
  features: { financingEnabled: true, sellMotoEnabled: true },
  financing: { monthlyRate: 1.79, installmentOptions: [12, 24, 36, 48], minDownPaymentPercent: 20 },
};

const BRANDS = ['Honda', 'Yamaha', 'Kawasaki', 'Suzuki', 'BMW', 'Royal Enfield'];

const MOTOS = [
  ['Honda', 'CB 500F', null, 2024, 4200, 38900, 471, 'Vermelha', { featured: true }],
  ['Honda', 'CB 650R', null, 2023, 9800, 54900, 649, 'Preta', { featured: true }],
  ['Honda', 'XRE 300', 'Adventure', 2023, 15400, 29900, 291, 'Prata', {}],
  [
    'Honda',
    'PCX 160',
    null,
    2024,
    3100,
    19900,
    156,
    'Branca',
    { onSale: true, previousPrice: 22400 },
  ],
  ['Honda', 'Biz 125', 'ES', 2022, 21800, 13500, 125, 'Azul', {}],
  ['Yamaha', 'MT-03', null, 2023, 7600, 33900, 321, 'Cinza', { featured: true }],
  ['Yamaha', 'MT-07', null, 2024, 2900, 49900, 689, 'Azul', {}],
  [
    'Yamaha',
    'Fazer FZ25',
    null,
    2022,
    18200,
    21900,
    249,
    'Preta',
    { onSale: true, previousPrice: 24500 },
  ],
  ['Yamaha', 'Lander 250', null, 2023, 11300, 24900, 249, 'Branca', {}],
  ['Yamaha', 'NMAX 160', 'Connected', 2024, 5400, 21500, 155, 'Cinza', {}],
  ['Kawasaki', 'Ninja 400', null, 2023, 8900, 39900, 399, 'Verde', { featured: true }],
  ['Kawasaki', 'Z900', null, 2022, 16700, 58900, 948, 'Preta', {}],
  ['Kawasaki', 'Versys-X 300', 'Tourer', 2023, 12400, 42900, 296, 'Verde', {}],
  ['Suzuki', 'GSX-S750', null, 2022, 19200, 46900, 749, 'Azul', {}],
  [
    'Suzuki',
    'V-Strom 650',
    'XT',
    2021,
    27800,
    44900,
    645,
    'Amarela',
    { status: MOTO_STATUS.RESERVED },
  ],
  ['Suzuki', 'Burgman 125', null, 2023, 9100, 16900, 125, 'Preta', {}],
  ['BMW', 'G 310 GS', null, 2023, 10600, 37900, 313, 'Branca', {}],
  ['BMW', 'F 850 GS', 'Adventure', 2021, 31500, 79900, 853, 'Cinza', { featured: true }],
  ['BMW', 'R 1250 GS', null, 2020, 42300, 98900, 1254, 'Preta', { status: MOTO_STATUS.SOLD }],
  ['Royal Enfield', 'Meteor 350', null, 2023, 6800, 27900, 349, 'Vinho', {}],
  ['Royal Enfield', 'Himalayan 411', null, 2022, 14900, 29900, 411, 'Verde', {}],
  [
    'Honda',
    'CG 160',
    'Titan',
    2019,
    38600,
    11900,
    162,
    'Vermelha',
    { status: MOTO_STATUS.INACTIVE },
  ],
];

function fuelFor(engineCapacity) {
  // Motos até 300cc no Brasil são majoritariamente flex.
  return engineCapacity <= 300 ? FUEL.FLEX : FUEL.GASOLINE;
}

function transmissionFor(engineCapacity) {
  return engineCapacity <= 160 ? TRANSMISSION.CVT : TRANSMISSION.MANUAL;
}

async function run() {
  // Verificado ANTES de conectar: o seed apaga motos e marcas.
  if (env.isProduction && !process.argv.includes(CONFIRMACAO)) {
    console.error(
      'Recusando rodar o seed em produção: ele APAGA todas as motos e marcas.\n' +
        `Para a loja de demonstração, confirme com: npm run seed -- ${CONFIRMACAO}`,
    );
    process.exitCode = 1;
    return;
  }

  const connected = await connectDatabase();
  if (!connected) {
    console.error('MONGODB_URI não definida — configure o .env antes de rodar o seed.');
    process.exitCode = 1;
    return;
  }

  console.log('Limpando motos e marcas…');
  await Promise.all([Moto.deleteMany({}), Brand.deleteMany({})]);

  const brands = await Brand.insertMany(
    BRANDS.map((name) => ({ name, slug: buildSlug([name]), active: true })),
  );
  const brandByName = new Map(brands.map((brand) => [brand.name, brand]));
  console.log(`${brands.length} marcas criadas.`);

  const docs = MOTOS.map(
    ([brandName, model, version, year, mileage, priceReais, cc, color, extra]) => {
      const brand = brandByName.get(brandName);

      return {
        brand: brand._id,
        model,
        version,
        year,
        mileage,
        price: toCents(priceReais),
        previousPrice: extra.previousPrice ? toCents(extra.previousPrice) : null,
        engineCapacity: cc,
        fuel: fuelFor(cc),
        transmission: transmissionFor(cc),
        color,
        description: `${brandName} ${model}${version ? ` ${version}` : ''} ${year}, revisada e com procedência comprovada. Aceitamos troca e financiamos em até 48x.`,
        features: ['Freios ABS', 'Painel digital', 'Partida elétrica'],
        featured: extra.featured ?? false,
        onSale: extra.onSale ?? false,
        status: extra.status ?? MOTO_STATUS.AVAILABLE,
        slug: buildSlug([brandName, model, version, year]),
      };
    },
  );

  await Moto.insertMany(docs);

  const byStatus = await Moto.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
  console.log(`${docs.length} motos criadas:`);
  for (const { _id, count } of byStatus) console.log(`  ${_id}: ${count}`);

  // A loja configurada pelo dono nunca é sobrescrita.
  if (!(await StoreSettings.exists({}))) {
    await StoreSettings.create(LOJA_DEMO);
    console.log(`Loja "${LOJA_DEMO.name}" criada (ajuste em Configurações no painel).`);
  }

  console.log('\nCriando índices…');
  await createAllIndexes();

  console.log('Seed concluído.');
}

run()
  .catch((error) => {
    console.error('Falha no seed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
    await mongoose.connection.close();
  });
