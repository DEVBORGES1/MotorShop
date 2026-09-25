import { createHash } from 'node:crypto';

import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import { logger } from '../../src/config/logger.js';
import { getStorage } from '../../src/infra/storage/index.js';
import { Brand } from '../../src/modules/brands/brand.model.js';
import { Moto } from '../../src/modules/motos/moto.model.js';
import { User } from '../../src/modules/users/user.model.js';
import { clienteAdmin, loginDeAdmin } from '../helpers/auth.js';
import { connect, disconnect, skipWithoutDb } from '../helpers/db.js';

const app = createApp();
const SEGREDO = 'segredo-apenas-para-testes'; // o mesmo do vitest.config.js

let token;
const admin = clienteAdmin(app, () => token);

/** Simula a resposta de upload do Cloudinary: assinatura de public_id + version. */
function metadadoDeUpload(publicId, extra = {}) {
  const version = 1_712_345_678;
  const signature = createHash('sha1')
    .update(`public_id=${publicId}&version=${version}${SEGREDO}`)
    .digest('hex');
  return {
    publicId,
    version,
    signature,
    format: 'jpg',
    bytes: 3_800_000,
    width: 1600,
    height: 1200,
    ...extra,
  };
}

async function criarMoto() {
  const marca = await Brand.create({
    name: `Marca ${Math.random()}`,
    slug: `m-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
  });
  return Moto.create({
    brand: marca._id,
    model: 'CB 500F',
    year: 2024,
    mileage: 100,
    price: 3_890_000,
    engineCapacity: 471,
    fuel: 'FLEX',
    transmission: 'MANUAL',
    color: 'Vermelha',
    slug: `moto-${Math.random().toString(16).slice(2, 10)}`,
  });
}

const vincular = (motoId, meta) => admin.post(`/api/admin/motos/${motoId}/imagens`).send(meta);
const pasta = (motoId) => `teste/motos/${motoId}`;

describe.skipIf(skipWithoutDb)('fotos das motos', () => {
  beforeAll(async () => {
    await connect();
    await User.deleteMany({});
    token = await loginDeAdmin(app);
  });
  afterAll(disconnect);
  beforeEach(async () => {
    await Promise.all([Moto.deleteMany({}), Brand.deleteMany({})]);
    vi.restoreAllMocks();
  });

  describe('POST /api/admin/uploads/assinatura', () => {
    it('401 sem autenticação', async () => {
      const moto = await criarMoto();
      const response = await request(app)
        .post('/api/admin/uploads/assinatura')
        .send({ motoId: String(moto._id) });
      expect(response.status).toBe(401);
    });

    it('assinatura escopada na pasta da moto, com formatos e tamanho máximo', async () => {
      const moto = await criarMoto();
      const response = await admin
        .post('/api/admin/uploads/assinatura')
        .send({ motoId: String(moto._id) });

      expect(response.status).toBe(200);
      expect(response.headers['cache-control']).toBe('no-store');
      const { fields, uploadUrl, maxBytes } = response.body.data;
      expect(uploadUrl).toContain('api.cloudinary.com');
      expect(fields.folder).toBe(pasta(moto._id));
      expect(fields.allowed_formats).toBe('jpg,jpeg,png,webp,avif,heic');
      expect(fields.signature).toMatch(/^[0-9a-f]{40}$/);
      expect(maxBytes).toBe(10 * 1024 * 1024);
      expect(JSON.stringify(response.body)).not.toContain(SEGREDO);
    });

    it('404 para moto inexistente — não assina pasta de nada', async () => {
      const response = await admin
        .post('/api/admin/uploads/assinatura')
        .send({ motoId: '507f1f77bcf86cd799439011' });
      expect(response.status).toBe(404);
    });
  });

  describe('vincular foto', () => {
    it('grava a foto com URL montada pelo servidor e a torna principal', async () => {
      const moto = await criarMoto();
      const response = await vincular(moto._id, metadadoDeUpload(`${pasta(moto._id)}/foto1`));

      expect(response.status).toBe(201);
      const [foto] = response.body.data.images;
      expect(foto).toMatchObject({
        publicId: `${pasta(moto._id)}/foto1`,
        width: 1600,
        height: 1200,
        order: 0,
      });
      expect(foto.url).toBe(
        `https://res.cloudinary.com/motorshop-teste/image/upload/v1712345678/${pasta(moto._id)}/foto1.jpg`,
      );
      expect(response.body.data.mainImageId).toBe(foto.id);
    });

    it('422 para public_id fora da pasta da moto', async () => {
      const moto = await criarMoto();
      const outra = await criarMoto();
      const response = await vincular(moto._id, metadadoDeUpload(`${pasta(outra._id)}/foto1`));
      expect(response.status).toBe(422);
    });

    it('422 para assinatura que não é do provedor', async () => {
      const moto = await criarMoto();
      const response = await vincular(moto._id, {
        ...metadadoDeUpload(`${pasta(moto._id)}/foto1`),
        signature: 'f'.repeat(40),
      });
      expect(response.status).toBe(422);
      expect((await Moto.findById(moto._id).lean()).images).toHaveLength(0);
    });

    it('422 para formato ou tamanho fora do permitido', async () => {
      const moto = await criarMoto();
      const id = `${pasta(moto._id)}/foto1`;
      expect((await vincular(moto._id, metadadoDeUpload(id, { format: 'gif' }))).status).toBe(422);
      expect(
        (await vincular(moto._id, metadadoDeUpload(id, { bytes: 11 * 1024 * 1024 }))).status,
      ).toBe(422);
    });

    it('não aceita URL do cliente (campo desconhecido)', async () => {
      const moto = await criarMoto();
      const response = await vincular(moto._id, {
        ...metadadoDeUpload(`${pasta(moto._id)}/foto1`),
        url: 'https://site-malicioso.example/x.jpg',
      });
      expect(response.status).toBe(422);
    });

    it('cadastro e edição da moto não aceitam mais `images`', async () => {
      const moto = await criarMoto();
      const response = await admin.patch(`/api/admin/motos/${moto._id}`).send({
        images: [{ id: 'x', publicId: 'x', url: 'https://site-malicioso.example/x.jpg' }],
      });
      expect(response.status).toBe(422);
    });

    it('reenvio do mesmo arquivo não duplica', async () => {
      const moto = await criarMoto();
      const meta = metadadoDeUpload(`${pasta(moto._id)}/foto1`);
      await vincular(moto._id, meta);
      const segundo = await vincular(moto._id, meta);
      expect(segundo.body.data.images).toHaveLength(1);
    });

    it('recusa a 21ª foto', async () => {
      const moto = await criarMoto();
      for (let i = 1; i <= 20; i += 1) {
        const r = await vincular(moto._id, metadadoDeUpload(`${pasta(moto._id)}/foto${i}`));
        expect(r.status, `foto ${i}`).toBe(201);
      }

      const vigesimaPrimeira = await vincular(
        moto._id,
        metadadoDeUpload(`${pasta(moto._id)}/foto21`),
      );
      expect(vigesimaPrimeira.status).toBe(422);
      expect(vigesimaPrimeira.body.message).toMatch(/20 fotos/);
      expect((await Moto.findById(moto._id).lean()).images).toHaveLength(20);
    });
  });

  describe('ordem, principal e alt', () => {
    async function motoComFotos(n) {
      const moto = await criarMoto();
      let ultima;
      for (let i = 1; i <= n; i += 1) {
        ultima = await vincular(moto._id, metadadoDeUpload(`${pasta(moto._id)}/foto${i}`));
      }
      return { moto, fotos: ultima.body.data.images };
    }

    it('reordena, define a principal e persiste', async () => {
      const { moto, fotos } = await motoComFotos(3);
      const novaOrdem = [fotos[2].id, fotos[0].id, fotos[1].id];

      const response = await admin
        .patch(`/api/admin/motos/${moto._id}/imagens/ordem`)
        .send({ order: novaOrdem, mainImageId: fotos[2].id });

      expect(response.status).toBe(200);
      const doc = await Moto.findById(moto._id).lean();
      expect(doc.images.map((i) => i.id)).toEqual(novaOrdem);
      expect(doc.images.map((i) => i.order)).toEqual([0, 1, 2]);
      expect(doc.mainImageId).toBe(fotos[2].id);

      // A principal é a que o catálogo público usa como capa.
      const publica = await request(app).get('/api/motos');
      expect(publica.body.data[0].mainImageId).toBe(fotos[2].id);
    });

    it('409 se a ordem enviada não corresponde às fotos atuais', async () => {
      const { moto, fotos } = await motoComFotos(2);
      const response = await admin
        .patch(`/api/admin/motos/${moto._id}/imagens/ordem`)
        .send({ order: [fotos[0].id], mainImageId: fotos[0].id });
      expect(response.status).toBe(409);
    });

    it('edita o texto alternativo', async () => {
      const { moto, fotos } = await motoComFotos(1);
      const response = await admin
        .patch(`/api/admin/motos/${moto._id}/imagens/${fotos[0].id}`)
        .send({ alt: 'Lateral esquerda da CB 500F vermelha' });
      expect(response.body.data.images[0].alt).toBe('Lateral esquerda da CB 500F vermelha');
    });
  });

  describe('excluir foto', () => {
    it('remove o metadado e o arquivo no provedor; a próxima vira principal', async () => {
      const destroy = vi.spyOn(getStorage(), 'destroy').mockResolvedValue();
      const moto = await criarMoto();
      await vincular(moto._id, metadadoDeUpload(`${pasta(moto._id)}/foto1`));
      const { body } = await vincular(moto._id, metadadoDeUpload(`${pasta(moto._id)}/foto2`));
      const [principal, segunda] = body.data.images;

      const response = await admin.delete(`/api/admin/motos/${moto._id}/imagens/${principal.id}`);

      expect(response.status).toBe(200);
      expect(response.body.data.images.map((i) => i.id)).toEqual([segunda.id]);
      expect(response.body.data.mainImageId).toBe(segunda.id);
      expect(destroy).toHaveBeenCalledWith(`${pasta(moto._id)}/foto1`);
    });

    it('falha do provedor não derruba a exclusão e é logada', async () => {
      vi.spyOn(getStorage(), 'destroy').mockRejectedValue(new Error('Cloudinary fora do ar'));
      const aviso = vi.spyOn(logger, 'warn').mockImplementation(() => {});
      const moto = await criarMoto();
      const { body } = await vincular(moto._id, metadadoDeUpload(`${pasta(moto._id)}/foto1`));

      const response = await admin.delete(
        `/api/admin/motos/${moto._id}/imagens/${body.data.images[0].id}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.data.images).toHaveLength(0);
      expect(response.body.data.mainImageId).toBeNull();
      await vi.waitFor(() => expect(aviso).toHaveBeenCalled());
      expect(JSON.stringify(aviso.mock.calls)).toMatch(/reconciliação/);
    });

    it('404 para foto inexistente', async () => {
      const moto = await criarMoto();
      const response = await admin.delete(
        `/api/admin/motos/${moto._id}/imagens/2b1f9a8e-6d2c-4f6e-9b0a-1c2d3e4f5a6b`,
      );
      expect(response.status).toBe(404);
    });
  });
});
