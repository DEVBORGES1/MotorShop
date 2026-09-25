import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../src/app.js';
import { User } from '../../src/modules/users/user.model.js';
import { clienteAdmin, loginDeAdmin } from '../helpers/auth.js';
import { Brand } from '../../src/modules/brands/brand.model.js';
import { Moto } from '../../src/modules/motos/moto.model.js';
import { clear, connect, disconnect, skipWithoutDb } from '../helpers/db.js';

const app = createApp();

// Rotas do painel exigem autenticação desde a FASE 3.
let token;
const admin = clienteAdmin(app, () => token);

async function conectarComoAdmin() {
  await connect();
  await User.deleteMany({});
  token = await loginDeAdmin(app);
}

describe.skipIf(skipWithoutDb)('API de marcas', () => {
  beforeAll(conectarComoAdmin);
  afterAll(disconnect);
  beforeEach(clear);

  describe('POST /api/admin/marcas', () => {
    it('cria a marca e gera o slug no servidor', async () => {
      const response = await admin.post('/api/admin/marcas').send({ name: 'Royal Enfield' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.slug).toBe('royal-enfield');
    });

    it('recusa nome duplicado com 409', async () => {
      await admin.post('/api/admin/marcas').send({ name: 'Honda' });
      const response = await admin.post('/api/admin/marcas').send({ name: 'Honda' });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });

    it('trata duplicidade ignorando maiúsculas', async () => {
      await admin.post('/api/admin/marcas').send({ name: 'Honda' });
      const response = await admin.post('/api/admin/marcas').send({ name: 'HONDA' });

      expect(response.status).toBe(409);
    });

    it('rejeita payload inválido com 422', async () => {
      expect((await admin.post('/api/admin/marcas').send({ name: '' })).status).toBe(422);
      expect(
        (await admin.post('/api/admin/marcas').send({ name: 'X', slug: 'forjado' })).status,
      ).toBe(422);
    });
  });

  describe('GET /api/marcas (público)', () => {
    it('lista apenas marcas ativas, em ordem alfabética', async () => {
      await Brand.create([
        { name: 'Yamaha', slug: 'yamaha', active: true },
        { name: 'Honda', slug: 'honda', active: true },
        { name: 'Extinta', slug: 'extinta', active: false },
      ]);

      const { body } = await request(app).get('/api/marcas');

      expect(body.data.map((b) => b.name)).toEqual(['Honda', 'Yamaha']);
    });
  });

  describe('DELETE /api/admin/marcas/:id', () => {
    it('exclui marca sem motos', async () => {
      const brand = await Brand.create({ name: 'Honda', slug: 'honda' });

      expect((await admin.delete(`/api/admin/marcas/${brand._id}`)).status).toBe(204);
      expect(await Brand.countDocuments()).toBe(0);
    });

    it('bloqueia exclusão de marca em uso com 409 e sugere desativar', async () => {
      const brand = await Brand.create({ name: 'Honda', slug: 'honda' });
      await Moto.create({
        brand: brand._id,
        model: 'CB 500F',
        year: 2024,
        mileage: 100,
        price: 3_890_000,
        engineCapacity: 471,
        fuel: 'FLEX',
        transmission: 'MANUAL',
        color: 'Vermelha',
        slug: 'honda-cb-500f-2024',
      });

      const response = await admin.delete(`/api/admin/marcas/${brand._id}`);

      expect(response.status).toBe(409);
      expect(response.body.message).toMatch(/desative/i);
      expect(await Brand.countDocuments()).toBe(1);
    });

    it('devolve 404 para marca inexistente', async () => {
      const response = await admin.delete('/api/admin/marcas/507f1f77bcf86cd799439011');
      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/admin/marcas/:id', () => {
    it('atualiza o nome sem regerar o slug (links já indexados)', async () => {
      const brand = await Brand.create({ name: 'Honda', slug: 'honda' });

      const { body } = await admin
        .patch(`/api/admin/marcas/${brand._id}`)
        .send({ name: 'Honda Motos' });

      expect(body.data.name).toBe('Honda Motos');
      expect(body.data.slug).toBe('honda');
    });
  });
});

describe.skipIf(skipWithoutDb)('consistência do envelope de marcas', () => {
  beforeAll(conectarComoAdmin);
  afterAll(disconnect);
  beforeEach(clear);

  it('expõe "id" e nunca "_id" — mesma convenção das motos', async () => {
    await Brand.create({ name: 'Honda', slug: 'honda' });

    const { body } = await request(app).get('/api/marcas');

    expect(body.data[0]).toHaveProperty('id');
    expect(body.data[0]).not.toHaveProperty('_id');
    expect(body.data[0]).not.toHaveProperty('__v');
  });
});
