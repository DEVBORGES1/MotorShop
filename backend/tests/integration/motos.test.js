import { MOTO_STATUS } from '@motorshop/shared';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../src/app.js';
import { Brand } from '../../src/modules/brands/brand.model.js';
import { Moto } from '../../src/modules/motos/moto.model.js';
import { clear, connect, disconnect, skipWithoutDb } from '../helpers/db.js';

const app = createApp();

/** Cria uma moto direto no banco (preço em CENTAVOS, como no modelo). */
async function criarMoto(brandId, overrides = {}) {
  return Moto.create({
    brand: brandId,
    model: 'CB 500F',
    year: 2024,
    mileage: 4200,
    price: 3_890_000,
    engineCapacity: 471,
    fuel: 'FLEX',
    transmission: 'MANUAL',
    color: 'Vermelha',
    slug: `moto-${Math.random().toString(16).slice(2, 10)}`,
    ...overrides,
  });
}

describe.skipIf(skipWithoutDb)('API de motos', () => {
  let honda;
  let yamaha;

  beforeAll(connect);
  afterAll(disconnect);

  beforeEach(async () => {
    await clear();
    [honda, yamaha] = await Brand.create([
      { name: 'Honda', slug: 'honda' },
      { name: 'Yamaha', slug: 'yamaha' },
    ]);
  });

  // --- Escrita --------------------------------------------------------------

  describe('POST /api/admin/motos', () => {
    const payload = () => ({
      brand: String(honda._id),
      model: 'CB 500F',
      year: 2024,
      mileage: 4200,
      price: 38900, // reais na API
      engineCapacity: 471,
      fuel: 'FLEX',
      transmission: 'MANUAL',
      color: 'Vermelha',
    });

    it('cria a moto, gera o slug e devolve o preço em reais', async () => {
      const response = await request(app).post('/api/admin/motos').send(payload());

      expect(response.status).toBe(201);
      expect(response.body.data.slug).toBe('honda-cb-500f-2024');
      expect(response.body.data.price).toBe(38900);
      expect(response.body.data.brand.name).toBe('Honda');
    });

    it('armazena o preço em centavos no banco', async () => {
      await request(app).post('/api/admin/motos').send(payload());
      const doc = await Moto.findOne({ slug: 'honda-cb-500f-2024' }).lean();

      expect(doc.price).toBe(3_890_000);
    });

    it('resolve colisão de slug com sufixo', async () => {
      await request(app).post('/api/admin/motos').send(payload());
      const segunda = await request(app).post('/api/admin/motos').send(payload());

      expect(segunda.status).toBe(201);
      expect(segunda.body.data.slug).not.toBe('honda-cb-500f-2024');
      expect(segunda.body.data.slug).toMatch(/^honda-cb-500f-2024-[0-9a-f]{4}$/);
    });

    it('rejeita campo desconhecido com 422 (sem mass assignment)', async () => {
      const response = await request(app)
        .post('/api/admin/motos')
        .send({ ...payload(), slug: 'slug-forjado' });

      expect(response.status).toBe(422);
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    it('rejeita marca inexistente com 400', async () => {
      const response = await request(app)
        .post('/api/admin/motos')
        .send({ ...payload(), brand: '507f1f77bcf86cd799439011' });

      expect(response.status).toBe(400);
    });

    it('rejeita marca inativa', async () => {
      const inativa = await Brand.create({ name: 'Extinta', slug: 'extinta', active: false });
      const response = await request(app)
        .post('/api/admin/motos')
        .send({ ...payload(), brand: String(inativa._id) });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/inativa/i);
    });
  });

  describe('PATCH e DELETE', () => {
    it('atualiza campos sem alterar o slug', async () => {
      const moto = await criarMoto(honda._id, { slug: 'honda-cb-500f-2024' });

      const { body } = await request(app)
        .patch(`/api/admin/motos/${moto._id}`)
        .send({ color: 'Preta', mileage: 5000 });

      expect(body.data.color).toBe('Preta');
      expect(body.data.slug).toBe('honda-cb-500f-2024');
    });

    it('altera o status pela rota dedicada', async () => {
      const moto = await criarMoto(honda._id);

      const { body } = await request(app)
        .patch(`/api/admin/motos/${moto._id}/status`)
        .send({ status: MOTO_STATUS.RESERVED });

      expect(body.data.status).toBe(MOTO_STATUS.RESERVED);
    });

    it('DELETE desativa em vez de apagar (soft delete)', async () => {
      const moto = await criarMoto(honda._id);

      const response = await request(app).delete(`/api/admin/motos/${moto._id}`);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe(MOTO_STATUS.INACTIVE);
      expect(await Moto.countDocuments()).toBe(1); // continua no banco
    });
  });

  // --- Segurança ------------------------------------------------------------

  describe('exposição de dados (R-14)', () => {
    it('nunca devolve licensePlate na listagem pública', async () => {
      await criarMoto(honda._id, { licensePlate: 'ABC1D23' });

      const response = await request(app).get('/api/motos');

      expect(JSON.stringify(response.body)).not.toContain('ABC1D23');
      expect(response.body.data[0]).not.toHaveProperty('licensePlate');
    });

    it('nunca devolve licensePlate no detalhe público', async () => {
      await criarMoto(honda._id, { slug: 'moto-publica', licensePlate: 'ABC1D23' });

      const response = await request(app).get('/api/motos/slug/moto-publica');

      expect(JSON.stringify(response.body)).not.toContain('ABC1D23');
      expect(response.body.data).not.toHaveProperty('licensePlate');
    });

    it('devolve licensePlate ao admin, que precisa dela', async () => {
      const moto = await criarMoto(honda._id, { licensePlate: 'ABC1D23' });

      const { body } = await request(app).get(`/api/admin/motos/${moto._id}`);

      expect(body.data.licensePlate).toBe('ABC1D23');
    });

    it('não expõe _id nem __v — a API usa "id"', async () => {
      await criarMoto(honda._id);

      const { body } = await request(app).get('/api/motos');

      expect(body.data[0]).toHaveProperty('id');
      expect(body.data[0]).not.toHaveProperty('_id');
      expect(body.data[0]).not.toHaveProperty('__v');
    });

    it('esconde motos INACTIVE do público, na lista e por slug', async () => {
      await criarMoto(honda._id, { slug: 'moto-inativa', status: MOTO_STATUS.INACTIVE });

      expect((await request(app).get('/api/motos')).body.data).toHaveLength(0);
      expect((await request(app).get('/api/motos/slug/moto-inativa')).status).toBe(404);
    });

    it('mantém a moto SOLD acessível por slug, mas fora da listagem (decisão A)', async () => {
      await criarMoto(honda._id, { slug: 'moto-vendida', status: MOTO_STATUS.SOLD });

      expect((await request(app).get('/api/motos')).body.data).toHaveLength(0);

      const detalhe = await request(app).get('/api/motos/slug/moto-vendida');
      expect(detalhe.status).toBe(200);
      expect(detalhe.body.data.status).toBe(MOTO_STATUS.SOLD);
    });

    it('oculta o preço da moto SOLD no detalhe público (decisão A)', async () => {
      await criarMoto(honda._id, {
        slug: 'moto-vendida',
        status: MOTO_STATUS.SOLD,
        price: 3_000_000,
        previousPrice: 3_200_000,
        onSale: true,
      });

      const { body } = await request(app).get('/api/motos/slug/moto-vendida');

      expect(body.data.price).toBeNull();
      expect(body.data.previousPrice).toBeNull();
    });

    it('404 para slug inexistente, também nos similares', async () => {
      expect((await request(app).get('/api/motos/slug/nao-existe')).status).toBe(404);
      expect((await request(app).get('/api/motos/slug/nao-existe/similares')).status).toBe(404);
    });

    it('404 nos similares de moto INACTIVE', async () => {
      await criarMoto(honda._id, { slug: 'moto-inativa', status: MOTO_STATUS.INACTIVE });

      const response = await request(app).get('/api/motos/slug/moto-inativa/similares');
      expect(response.status).toBe(404);
    });

    it('mostra ao admin todos os status, inclusive INACTIVE', async () => {
      await criarMoto(honda._id, { status: MOTO_STATUS.INACTIVE });
      await criarMoto(honda._id, { status: MOTO_STATUS.AVAILABLE });

      const { body } = await request(app).get('/api/admin/motos');

      expect(body.data).toHaveLength(2);
    });
  });

  // --- Catálogo -------------------------------------------------------------

  describe('GET /api/motos — filtros', () => {
    beforeEach(async () => {
      await Promise.all([
        criarMoto(honda._id, {
          model: 'CB 500F',
          year: 2024,
          mileage: 4000,
          price: 3_890_000,
          engineCapacity: 471,
          fuel: 'FLEX',
          transmission: 'MANUAL',
        }),
        criarMoto(honda._id, {
          model: 'PCX 160',
          year: 2022,
          mileage: 20_000,
          price: 1_990_000,
          engineCapacity: 156,
          fuel: 'FLEX',
          transmission: 'CVT',
        }),
        criarMoto(yamaha._id, {
          model: 'MT-07',
          year: 2023,
          mileage: 9000,
          price: 4_990_000,
          engineCapacity: 689,
          fuel: 'GASOLINE',
          transmission: 'MANUAL',
        }),
      ]);
    });

    const listar = (query = '') => request(app).get(`/api/motos${query}`);

    it('sem filtro devolve tudo que é público', async () => {
      expect((await listar()).body.data).toHaveLength(3);
    });

    it('filtra por marca', async () => {
      expect((await listar('?marca=honda')).body.data).toHaveLength(2);
      expect((await listar('?marca=yamaha')).body.data).toHaveLength(1);
    });

    it('aceita múltiplas marcas', async () => {
      expect((await listar('?marca=honda,yamaha')).body.data).toHaveLength(3);
    });

    it('devolve lista vazia para marca inexistente, sem erro', async () => {
      const response = await listar('?marca=ducati');
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(0);
    });

    it('filtra por faixa de preço, em reais', async () => {
      expect((await listar('?precoMax=20000')).body.data).toHaveLength(1);
      expect((await listar('?precoMin=30000')).body.data).toHaveLength(2);
      expect((await listar('?precoMin=19000&precoMax=40000')).body.data).toHaveLength(2);
    });

    it('filtra por ano, quilometragem e cilindrada', async () => {
      expect((await listar('?anoMin=2023')).body.data).toHaveLength(2);
      expect((await listar('?kmMax=10000')).body.data).toHaveLength(2);
      expect((await listar('?ccMin=400')).body.data).toHaveLength(2);
    });

    it('filtra por combustível e câmbio', async () => {
      expect((await listar('?combustivel=GASOLINE')).body.data).toHaveLength(1);
      expect((await listar('?cambio=CVT')).body.data).toHaveLength(1);
    });

    it('combina filtros', async () => {
      const { body } = await listar('?marca=honda&precoMax=25000&cambio=CVT');
      expect(body.data).toHaveLength(1);
      expect(body.data[0].model).toBe('PCX 160');
    });

    it('faz busca textual por modelo', async () => {
      const { body } = await listar('?q=PCX');
      expect(body.data).toHaveLength(1);
      expect(body.data[0].model).toBe('PCX 160');
    });

    it('rejeita filtro desconhecido e ordenação inválida com 422', async () => {
      expect((await listar('?ordenar=preco')).status).toBe(422);
      expect((await listar('?sort=preco')).status).toBe(422);
    });

    it('rejeita tentativa de injeção de operador', async () => {
      expect((await listar('?precoMin[$gt]=0')).status).toBe(422);
    });
  });

  describe('GET /api/motos — ordenação e paginação', () => {
    beforeEach(async () => {
      await Promise.all([
        criarMoto(honda._id, { price: 3_000_000, year: 2020, mileage: 30_000 }),
        criarMoto(honda._id, { price: 1_000_000, year: 2024, mileage: 10_000 }),
        criarMoto(honda._id, { price: 2_000_000, year: 2022, mileage: 20_000 }),
      ]);
    });

    it.each([
      ['preco_asc', 'price', [10_000, 20_000, 30_000]],
      ['preco_desc', 'price', [30_000, 20_000, 10_000]],
    ])('ordena por %s', async (sort, campo, esperado) => {
      const { body } = await request(app).get(`/api/motos?sort=${sort}`);
      expect(body.data.map((m) => m[campo])).toEqual(esperado);
    });

    it('ordena por ano nos dois sentidos', async () => {
      const asc = await request(app).get('/api/motos?sort=ano_asc');
      const desc = await request(app).get('/api/motos?sort=ano_desc');

      expect(asc.body.data.map((m) => m.year)).toEqual([2020, 2022, 2024]);
      expect(desc.body.data.map((m) => m.year)).toEqual([2024, 2022, 2020]);
    });

    it('ordena por quilometragem nos dois sentidos', async () => {
      const asc = await request(app).get('/api/motos?sort=km_asc');
      const desc = await request(app).get('/api/motos?sort=km_desc');

      expect(asc.body.data.map((m) => m.mileage)).toEqual([10_000, 20_000, 30_000]);
      expect(desc.body.data.map((m) => m.mileage)).toEqual([30_000, 20_000, 10_000]);
    });

    it('pagina e devolve meta coerente', async () => {
      const { body } = await request(app).get('/api/motos?limit=2&page=1&sort=preco_asc');

      expect(body.data).toHaveLength(2);
      expect(body.meta).toEqual({ page: 1, limit: 2, total: 3, totalPages: 2 });
    });

    it('a segunda página traz o restante', async () => {
      const { body } = await request(app).get('/api/motos?limit=2&page=2&sort=preco_asc');

      expect(body.data).toHaveLength(1);
      expect(body.data[0].price).toBe(30_000);
    });

    it('recusa limite acima do teto do servidor', async () => {
      expect((await request(app).get('/api/motos?limit=100')).status).toBe(422);
    });
  });

  describe('GET /api/motos/slug/:slug/similares', () => {
    it('exclui a própria moto e respeita o filtro público', async () => {
      await criarMoto(honda._id, { slug: 'moto-alvo', price: 3_000_000 });
      await criarMoto(honda._id, { price: 3_100_000 });
      await criarMoto(honda._id, { price: 3_200_000, status: MOTO_STATUS.INACTIVE });

      const { body } = await request(app).get('/api/motos/slug/moto-alvo/similares');

      expect(body.data).toHaveLength(1);
      expect(body.data.some((m) => m.slug === 'moto-alvo')).toBe(false);
    });

    it('não sugere moto vendida como similar', async () => {
      await criarMoto(honda._id, { slug: 'moto-alvo', price: 3_000_000 });
      await criarMoto(honda._id, { price: 3_100_000, status: MOTO_STATUS.SOLD });

      const { body } = await request(app).get('/api/motos/slug/moto-alvo/similares');

      expect(body.data).toHaveLength(0);
    });
  });

  describe('GET /api/filtros', () => {
    it('devolve faixas reais do estoque, em reais, sem baixar o catálogo', async () => {
      await Promise.all([
        criarMoto(honda._id, {
          price: 1_990_000,
          year: 2022,
          mileage: 20_000,
          engineCapacity: 156,
        }),
        criarMoto(yamaha._id, { price: 4_990_000, year: 2024, mileage: 4000, engineCapacity: 689 }),
        criarMoto(honda._id, { price: 9_990_000, status: MOTO_STATUS.INACTIVE }),
      ]);

      const { body } = await request(app).get('/api/filtros');

      expect(body.data.total).toBe(2);
      expect(body.data.price).toEqual({ min: 19_900, max: 49_900 }); // INACTIVE fora
      expect(body.data.year).toEqual({ min: 2022, max: 2024 });
      expect(body.data.brands).toHaveLength(2);
      expect(body.data.brands.every((b) => b.count > 0)).toBe(true);
    });

    it('não quebra com estoque vazio', async () => {
      const { body } = await request(app).get('/api/filtros');

      expect(body.data.total).toBe(0);
      expect(body.data.price).toBeNull();
      expect(body.data.brands).toEqual([]);
    });
  });

  // --- Desempenho -----------------------------------------------------------

  describe('uso de índice', () => {
    /** Procura um estágio pelo nome em qualquer profundidade do plano. */
    const usaEstagio = (plano, nome) => JSON.stringify(plano).includes(`"${nome}"`);

    beforeEach(async () => {
      await Promise.all(
        Array.from({ length: 30 }, (_, i) =>
          criarMoto(honda._id, { price: 1_000_000 + i * 100_000, year: 2015 + (i % 10) }),
        ),
      );
    });

    it('a listagem ordenada por preço usa IXSCAN, não COLLSCAN', async () => {
      const plano = await Moto.find({ status: { $in: ['AVAILABLE', 'RESERVED'] } })
        .sort({ price: 1 })
        .explain('queryPlanner');

      expect(usaEstagio(plano.queryPlanner.winningPlan, 'IXSCAN')).toBe(true);
      expect(usaEstagio(plano.queryPlanner.winningPlan, 'COLLSCAN')).toBe(false);
    });

    it('a busca por slug usa o índice único', async () => {
      const plano = await Moto.findOne({ slug: 'inexistente' }).explain('queryPlanner');

      expect(usaEstagio(plano.queryPlanner.winningPlan, 'IXSCAN')).toBe(true);
    });

    it('a listagem padrão da home usa índice', async () => {
      const plano = await Moto.find({ status: { $in: ['AVAILABLE', 'RESERVED'] } })
        .sort({ featured: -1, createdAt: -1 })
        .explain('queryPlanner');

      expect(usaEstagio(plano.queryPlanner.winningPlan, 'COLLSCAN')).toBe(false);
    });
  });
});
